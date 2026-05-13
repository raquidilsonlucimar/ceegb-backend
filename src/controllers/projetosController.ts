import { Request, Response } from 'express';
import slugify from 'slugify';
import pool from '../config/database';
import { CreateProjetoDto, PaginatedResult, Projeto } from '../types';
import { HttpError } from '../middleware/error';

const slug = (str: string) =>
  slugify(str, { lower: true, strict: true, locale: 'pt' });

// GET /api/projetos
export async function listar(req: Request, res: Response): Promise<void> {
  const page   = Math.max(1, Number(req.query.page  ?? 1));
  const limit  = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  const offset = (page - 1) * limit;
  const estado = req.query.estado as string | undefined;
  const publicado = req.user ? undefined : 1; // admin vê tudo

  let where = 'WHERE 1=1';
  const params: unknown[] = [];

  if (publicado !== undefined) { where += ' AND p.publicado = ?'; params.push(publicado); }
  if (estado) { where += ' AND p.estado = ?'; params.push(estado); }

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM projetos p ${where}`, params,
  );

  const [rows]: any = await pool.query(
    `SELECT p.*, c.nome AS categoria_nome
       FROM projetos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}
       ORDER BY p.criado_em DESC
       LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // Buscar documentos para cada projeto
  const ids: number[] = rows.map((r: any) => r.id);
  let docs: any[] = [];
  if (ids.length) {
    [docs] = await pool.query(
      `SELECT * FROM projeto_documentos WHERE projeto_id IN (${ids.map(() => '?').join(',')})`,
      ids,
    ) as any;
  }

  const projetos: Projeto[] = rows.map((p: any) => ({
    ...p,
    publicado: Boolean(p.publicado),
    documentos: docs.filter((d: any) => d.projeto_id === p.id),
  }));

  const result: PaginatedResult<Projeto> = {
    data: projetos, total, page, limit,
    totalPages: Math.ceil(total / limit),
  };

  res.json(result);
}

// GET /api/projetos/:slug
export async function obter(req: Request, res: Response): Promise<void> {
  const [[projeto]]: any = await pool.query(
    `SELECT p.*, c.nome AS categoria_nome
       FROM projetos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.slug = ? LIMIT 1`,
    [req.params.slug],
  );

  if (!projeto) throw new HttpError(404, 'Projeto não encontrado');

  const [docs]: any = await pool.query(
    'SELECT * FROM projeto_documentos WHERE projeto_id = ? ORDER BY criado_em',
    [projeto.id],
  );

  res.json({ ...projeto, publicado: Boolean(projeto.publicado), documentos: docs });
}

// POST /api/projetos
export async function criar(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateProjetoDto;

  if (!dto.titulo || !dto.descricao || !dto.categoria_id)
    throw new HttpError(400, 'titulo, descricao e categoria_id são obrigatórios');

  const projectSlug = slug(dto.titulo);

  const [result]: any = await pool.query(
    `INSERT INTO projetos
       (titulo, slug, descricao, descricao_longa, categoria_id, estado,
        progresso, responsavel, data_inicio, data_fim_prevista, orcamento,
        financiador, publicado, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dto.titulo, projectSlug, dto.descricao, dto.descricao_longa ?? null,
      dto.categoria_id, dto.estado ?? 'planeamento', dto.progresso ?? 0,
      dto.responsavel ?? null, dto.data_inicio ?? null,
      dto.data_fim_prevista ?? null, dto.orcamento ?? null,
      dto.financiador ?? null, dto.publicado !== false ? 1 : 0,
      req.user!.id,
    ],
  );

  await auditoria(req.user!.id, 'criar_projeto', 'projetos', result.insertId, req.ip);
  res.status(201).json({ id: result.insertId, slug: projectSlug });
}

// PUT /api/projetos/:id
export async function atualizar(req: Request, res: Response): Promise<void> {
  const id  = Number(req.params.id);
  const dto = req.body as Partial<CreateProjetoDto>;

  const [[exist]]: any = await pool.query('SELECT id FROM projetos WHERE id = ?', [id]);
  if (!exist) throw new HttpError(404, 'Projeto não encontrado');

  const fields: string[] = [];
  const values: unknown[] = [];

  const add = (col: string, val: unknown) => { fields.push(`${col} = ?`); values.push(val); };

  if (dto.titulo)            { add('titulo', dto.titulo); add('slug', slug(dto.titulo)); }
  if (dto.descricao)         add('descricao', dto.descricao);
  if (dto.descricao_longa !== undefined) add('descricao_longa', dto.descricao_longa);
  if (dto.categoria_id)      add('categoria_id', dto.categoria_id);
  if (dto.estado)            add('estado', dto.estado);
  if (dto.progresso !== undefined) add('progresso', dto.progresso);
  if (dto.responsavel !== undefined) add('responsavel', dto.responsavel);
  if (dto.data_inicio !== undefined) add('data_inicio', dto.data_inicio);
  if (dto.data_fim_prevista !== undefined) add('data_fim_prevista', dto.data_fim_prevista);
  if (dto.orcamento !== undefined) add('orcamento', dto.orcamento);
  if (dto.financiador !== undefined) add('financiador', dto.financiador);
  if (dto.publicado !== undefined) add('publicado', dto.publicado ? 1 : 0);

  if (!fields.length) throw new HttpError(400, 'Nenhum campo para atualizar');

  await pool.query(`UPDATE projetos SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
  await auditoria(req.user!.id, 'editar_projeto', 'projetos', id, req.ip);

  res.json({ mensagem: 'Projeto atualizado' });
}

// DELETE /api/projetos/:id
export async function remover(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const [[exist]]: any = await pool.query('SELECT id FROM projetos WHERE id = ?', [id]);
  if (!exist) throw new HttpError(404, 'Projeto não encontrado');

  await pool.query('DELETE FROM projetos WHERE id = ?', [id]);
  await auditoria(req.user!.id, 'remover_projeto', 'projetos', id, req.ip);

  res.json({ mensagem: 'Projeto removido' });
}

// POST /api/projetos/:id/documentos
export async function adicionarDocumento(req: Request, res: Response): Promise<void> {
  const projeto_id = Number(req.params.id);
  const { nome, tipo, url, tamanho_kb } = req.body;

  if (!nome || !url) throw new HttpError(400, 'nome e url são obrigatórios');

  const [result]: any = await pool.query(
    'INSERT INTO projeto_documentos (projeto_id, nome, tipo, url, tamanho_kb) VALUES (?,?,?,?,?)',
    [projeto_id, nome, tipo ?? 'pdf', url, tamanho_kb ?? null],
  );

  res.status(201).json({ id: result.insertId });
}

// DELETE /api/projetos/:id/documentos/:docId
export async function removerDocumento(req: Request, res: Response): Promise<void> {
  await pool.query(
    'DELETE FROM projeto_documentos WHERE id = ? AND projeto_id = ?',
    [req.params.docId, req.params.id],
  );
  res.json({ mensagem: 'Documento removido' });
}

// Util: registar auditoria
async function auditoria(
  userId: number, acao: string, tabela: string, id: number, ip?: string,
) {
  await pool.query(
    'INSERT INTO auditoria (utilizador_id, acao, tabela, registo_id, ip) VALUES (?,?,?,?,?)',
    [userId, acao, tabela, id, ip ?? null],
  );
}
