import { Request, Response } from 'express';
import slugify from 'slugify';
import pool from '../config/database';
import {
  CreateRelatorioDto, CreateNoticiaDto, CreateMembroDto, CreateMensagemDto,
} from '../types';
import { HttpError } from '../middleware/error';

const slug = (s: string) => slugify(s, { lower: true, strict: true, locale: 'pt' });

// ══════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ══════════════════════════════════════════════════════════════

export async function listarRelatorios(req: Request, res: Response): Promise<void> {
  const page   = Math.max(1, Number(req.query.page  ?? 1));
  const limit  = Math.min(50, Number(req.query.limit ?? 10));
  const offset = (page - 1) * limit;

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM relatorios WHERE ${req.user ? '1=1' : 'publicado=1'}`,
  );

  const [rows]: any = await pool.query(
    `SELECT r.*, c.nome AS categoria_nome
       FROM relatorios r
       LEFT JOIN categorias c ON c.id = r.categoria_id
       ${req.user ? '' : 'WHERE r.publicado = 1'}
       ORDER BY r.data_publicacao DESC
       LIMIT ? OFFSET ?`,
    [limit, offset],
  );

  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function criarRelatorio(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateRelatorioDto;
  if (!dto.titulo || !dto.categoria_id || !dto.data_publicacao)
    throw new HttpError(400, 'titulo, categoria_id e data_publicacao são obrigatórios');

  const [r]: any = await pool.query(
    `INSERT INTO relatorios
       (titulo, slug, resumo, conteudo, categoria_id, url_documento,
        data_publicacao, publicado, destaque, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      dto.titulo, slug(dto.titulo), dto.resumo ?? null, dto.conteudo ?? null,
      dto.categoria_id, dto.url_documento ?? null, dto.data_publicacao,
      dto.publicado !== false ? 1 : 0, dto.destaque ? 1 : 0, req.user!.id,
    ],
  );
  res.status(201).json({ id: r.insertId });
}

export async function obterRelatorio(req: Request, res: Response): Promise<void> {
  const [[r]]: any = await pool.query(
    `SELECT r.*, c.nome AS categoria_nome
       FROM relatorios r
       LEFT JOIN categorias c ON c.id = r.categoria_id
       WHERE r.id = ? LIMIT 1`,
    [req.params.id],
  );
  if (!r) throw new HttpError(404, 'Relatório não encontrado');
  res.json(r);
}

export async function atualizarRelatorio(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const dto = req.body as Partial<CreateRelatorioDto>;
  const fields: string[] = []; const values: unknown[] = [];
  const add = (c: string, v: unknown) => { fields.push(`${c}=?`); values.push(v); };

  if (dto.titulo)          { add('titulo', dto.titulo); add('slug', slug(dto.titulo)); }
  if (dto.resumo !== undefined) add('resumo', dto.resumo);
  if (dto.conteudo !== undefined) add('conteudo', dto.conteudo);
  if (dto.categoria_id)    add('categoria_id', dto.categoria_id);
  if (dto.url_documento !== undefined) add('url_documento', dto.url_documento);
  if (dto.data_publicacao) add('data_publicacao', dto.data_publicacao);
  if (dto.publicado !== undefined) add('publicado', dto.publicado ? 1 : 0);
  if (dto.destaque !== undefined) add('destaque', dto.destaque ? 1 : 0);

  if (!fields.length) throw new HttpError(400, 'Nenhum campo para atualizar');
  await pool.query(`UPDATE relatorios SET ${fields.join(',')} WHERE id=?`, [...values, id]);
  res.json({ mensagem: 'Relatório atualizado' });
}

export async function removerRelatorio(req: Request, res: Response): Promise<void> {
  await pool.query('DELETE FROM relatorios WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Relatório removido' });
}

export async function incrementarDownload(req: Request, res: Response): Promise<void> {
  await pool.query('UPDATE relatorios SET downloads = downloads + 1 WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Download registado' });
}

// ══════════════════════════════════════════════════════════════
//  NOTÍCIAS
// ══════════════════════════════════════════════════════════════

export async function listarNoticias(req: Request, res: Response): Promise<void> {
  const page   = Math.max(1, Number(req.query.page  ?? 1));
  const limit  = Math.min(50, Number(req.query.limit ?? 10));
  const offset = (page - 1) * limit;
  const pub    = req.user ? '' : 'WHERE publicado=1';

  const [[{ total }]]: any = await pool.query(`SELECT COUNT(*) AS total FROM noticias ${pub}`);
  const [rows]: any = await pool.query(
    `SELECT * FROM noticias ${pub} ORDER BY data_publicacao DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function obterNoticia(req: Request, res: Response): Promise<void> {
  const [[noticia]]: any = await pool.query(
    'SELECT * FROM noticias WHERE slug=? LIMIT 1', [req.params.slug],
  );
  if (!noticia) throw new HttpError(404, 'Notícia não encontrada');

  // Incrementar visualizações
  await pool.query('UPDATE noticias SET visualizacoes = visualizacoes + 1 WHERE id=?', [noticia.id]);
  res.json(noticia);
}

export async function criarNoticia(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateNoticiaDto;
  if (!dto.titulo || !dto.conteudo || !dto.data_publicacao)
    throw new HttpError(400, 'titulo, conteudo e data_publicacao são obrigatórios');

  const [r]: any = await pool.query(
    `INSERT INTO noticias
       (titulo, slug, resumo, conteudo, imagem_url, destaque, publicado, data_publicacao, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      dto.titulo, slug(dto.titulo), dto.resumo ?? null, dto.conteudo,
      dto.imagem_url ?? null, dto.destaque ? 1 : 0,
      dto.publicado !== false ? 1 : 0, dto.data_publicacao, req.user!.id,
    ],
  );
  res.status(201).json({ id: r.insertId });
}

export async function atualizarNoticia(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const dto = req.body as Partial<CreateNoticiaDto>;
  const fields: string[] = []; const values: unknown[] = [];
  const add = (c: string, v: unknown) => { fields.push(`${c}=?`); values.push(v); };

  if (dto.titulo)          { add('titulo', dto.titulo); add('slug', slug(dto.titulo)); }
  if (dto.resumo !== undefined) add('resumo', dto.resumo);
  if (dto.conteudo)        add('conteudo', dto.conteudo);
  if (dto.imagem_url !== undefined) add('imagem_url', dto.imagem_url);
  if (dto.destaque !== undefined) add('destaque', dto.destaque ? 1 : 0);
  if (dto.publicado !== undefined) add('publicado', dto.publicado ? 1 : 0);
  if (dto.data_publicacao) add('data_publicacao', dto.data_publicacao);

  if (!fields.length) throw new HttpError(400, 'Nenhum campo para atualizar');
  await pool.query(`UPDATE noticias SET ${fields.join(',')} WHERE id=?`, [...values, id]);
  res.json({ mensagem: 'Notícia atualizada' });
}

export async function removerNoticia(req: Request, res: Response): Promise<void> {
  await pool.query('DELETE FROM noticias WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Notícia removida' });
}

// ══════════════════════════════════════════════════════════════
//  EQUIPA
// ══════════════════════════════════════════════════════════════

export async function listarEquipa(req: Request, res: Response): Promise<void> {
  const [rows]: any = await pool.query(
    'SELECT * FROM equipa WHERE ativo=1 ORDER BY ordem, nome',
  );
  res.json(rows);
}

export async function criarMembro(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateMembroDto;
  if (!dto.nome || !dto.cargo) throw new HttpError(400, 'nome e cargo são obrigatórios');

  const [r]: any = await pool.query(
    `INSERT INTO equipa (nome, cargo, bio, email, telefone, linkedin, cor_avatar, ordem)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      dto.nome, dto.cargo, dto.bio ?? null, dto.email ?? null,
      dto.telefone ?? null, dto.linkedin ?? null,
      dto.cor_avatar ?? '#142240', dto.ordem ?? 0,
    ],
  );
  res.status(201).json({ id: r.insertId });
}

export async function atualizarMembro(req: Request, res: Response): Promise<void> {
  const dto = req.body as Partial<CreateMembroDto>;
  const fields: string[] = []; const values: unknown[] = [];
  const add = (c: string, v: unknown) => { fields.push(`${c}=?`); values.push(v); };

  if (dto.nome)      add('nome', dto.nome);
  if (dto.cargo)     add('cargo', dto.cargo);
  if (dto.bio !== undefined) add('bio', dto.bio);
  if (dto.email !== undefined) add('email', dto.email);
  if (dto.telefone !== undefined) add('telefone', dto.telefone);
  if (dto.linkedin !== undefined) add('linkedin', dto.linkedin);
  if (dto.cor_avatar) add('cor_avatar', dto.cor_avatar);
  if (dto.ordem !== undefined) add('ordem', dto.ordem);

  if (!fields.length) throw new HttpError(400, 'Nenhum campo para atualizar');
  await pool.query(`UPDATE equipa SET ${fields.join(',')} WHERE id=?`, [...values, req.params.id]);
  res.json({ mensagem: 'Membro atualizado' });
}

export async function removerMembro(req: Request, res: Response): Promise<void> {
  await pool.query('UPDATE equipa SET ativo=0 WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Membro desativado' });
}

// ══════════════════════════════════════════════════════════════
//  MENSAGENS
// ══════════════════════════════════════════════════════════════

export async function listarMensagens(req: Request, res: Response): Promise<void> {
  const naoLidas = req.query.nao_lidas === '1';
  const where    = naoLidas ? 'WHERE lida=0' : '';
  const [rows]: any = await pool.query(
    `SELECT * FROM mensagens ${where} ORDER BY criado_em DESC`,
  );
  res.json(rows);
}

export async function criarMensagem(req: Request, res: Response): Promise<void> {
  const dto = req.body as CreateMensagemDto;
  if (!dto.nome || !dto.email || !dto.assunto || !dto.mensagem)
    throw new HttpError(400, 'nome, email, assunto e mensagem são obrigatórios');

  // Validação simples de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email))
    throw new HttpError(400, 'Email inválido');

  const [r]: any = await pool.query(
    `INSERT INTO mensagens (nome, email, telefone, organizacao, assunto, mensagem, ip_origem)
     VALUES (?,?,?,?,?,?,?)`,
    [
      dto.nome, dto.email, dto.telefone ?? null,
      dto.organizacao ?? null, dto.assunto, dto.mensagem, req.ip ?? null,
    ],
  );
  res.status(201).json({ id: r.insertId, mensagem: 'Mensagem enviada com sucesso' });
}

export async function marcarLida(req: Request, res: Response): Promise<void> {
  await pool.query('UPDATE mensagens SET lida=1 WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Marcada como lida' });
}

export async function removerMensagem(req: Request, res: Response): Promise<void> {
  await pool.query('DELETE FROM mensagens WHERE id=?', [req.params.id]);
  res.json({ mensagem: 'Mensagem removida' });
}

// ══════════════════════════════════════════════════════════════
//  INDICADORES DE MERCADO
// ══════════════════════════════════════════════════════════════

export async function listarIndicadores(req: Request, res: Response): Promise<void> {
  const [rows]: any = await pool.query(
    'SELECT * FROM indicadores_mercado WHERE ativo=1 ORDER BY ordem',
  );
  res.json(rows);
}

export async function atualizarIndicador(req: Request, res: Response): Promise<void> {
  const { valor, descricao } = req.body;
  await pool.query(
    'UPDATE indicadores_mercado SET valor=?, descricao=? WHERE id=?',
    [valor, descricao ?? null, req.params.id],
  );
  res.json({ mensagem: 'Indicador atualizado' });
}

// ══════════════════════════════════════════════════════════════
//  CATEGORIAS
// ══════════════════════════════════════════════════════════════

export async function listarCategorias(req: Request, res: Response): Promise<void> {
  const tipo = req.query.tipo as string | undefined;
  const [rows]: any = await pool.query(
    `SELECT * FROM categorias ${tipo ? 'WHERE tipo=?' : ''} ORDER BY nome`,
    tipo ? [tipo] : [],
  );
  res.json(rows);
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD (resumo para admin)
// ══════════════════════════════════════════════════════════════

export async function dashboard(req: Request, res: Response): Promise<void> {
  const [[projetos]]: any    = await pool.query('SELECT COUNT(*) AS total, SUM(estado="ativo") AS ativos FROM projetos');
  const [[relatorios]]: any  = await pool.query('SELECT COUNT(*) AS total FROM relatorios');
  const [[noticias]]: any    = await pool.query('SELECT COUNT(*) AS total FROM noticias');
  const [[mensagens]]: any   = await pool.query('SELECT COUNT(*) AS total, SUM(lida=0) AS nao_lidas FROM mensagens');
  const [[equipa]]: any      = await pool.query('SELECT COUNT(*) AS total FROM equipa WHERE ativo=1');

  const [recentes]: any = await pool.query(
    `SELECT 'projeto' AS tipo, titulo, criado_em FROM projetos
     UNION ALL
     SELECT 'noticia', titulo, criado_em FROM noticias
     ORDER BY criado_em DESC LIMIT 5`,
  );

  res.json({ projetos, relatorios, noticias, mensagens, equipa, recentes });
}