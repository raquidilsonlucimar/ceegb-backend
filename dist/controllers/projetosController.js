"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listar = listar;
exports.obter = obter;
exports.criar = criar;
exports.atualizar = atualizar;
exports.remover = remover;
exports.adicionarDocumento = adicionarDocumento;
exports.removerDocumento = removerDocumento;
const slugify_1 = __importDefault(require("slugify"));
const database_1 = __importDefault(require("../config/database"));
const error_1 = require("../middleware/error");
const slug = (str) => (0, slugify_1.default)(str, { lower: true, strict: true, locale: 'pt' });
// GET /api/projetos
async function listar(req, res) {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const offset = (page - 1) * limit;
    const estado = req.query.estado;
    const publicado = req.user ? undefined : 1; // admin vê tudo
    let where = 'WHERE 1=1';
    const params = [];
    if (publicado !== undefined) {
        where += ' AND p.publicado = ?';
        params.push(publicado);
    }
    if (estado) {
        where += ' AND p.estado = ?';
        params.push(estado);
    }
    const [[{ total }]] = await database_1.default.query(`SELECT COUNT(*) AS total FROM projetos p ${where}`, params);
    const [rows] = await database_1.default.query(`SELECT p.*, c.nome AS categoria_nome
       FROM projetos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       ${where}
       ORDER BY p.criado_em DESC
       LIMIT ? OFFSET ?`, [...params, limit, offset]);
    // Buscar documentos para cada projeto
    const ids = rows.map((r) => r.id);
    let docs = [];
    if (ids.length) {
        [docs] = await database_1.default.query(`SELECT * FROM projeto_documentos WHERE projeto_id IN (${ids.map(() => '?').join(',')})`, ids);
    }
    const projetos = rows.map((p) => ({
        ...p,
        publicado: Boolean(p.publicado),
        documentos: docs.filter((d) => d.projeto_id === p.id),
    }));
    const result = {
        data: projetos, total, page, limit,
        totalPages: Math.ceil(total / limit),
    };
    res.json(result);
}
// GET /api/projetos/:slug
async function obter(req, res) {
    const [[projeto]] = await database_1.default.query(`SELECT p.*, c.nome AS categoria_nome
       FROM projetos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.slug = ? LIMIT 1`, [req.params.slug]);
    if (!projeto)
        throw new error_1.HttpError(404, 'Projeto não encontrado');
    const [docs] = await database_1.default.query('SELECT * FROM projeto_documentos WHERE projeto_id = ? ORDER BY criado_em', [projeto.id]);
    res.json({ ...projeto, publicado: Boolean(projeto.publicado), documentos: docs });
}
// POST /api/projetos
async function criar(req, res) {
    const dto = req.body;
    if (!dto.titulo || !dto.descricao || !dto.categoria_id)
        throw new error_1.HttpError(400, 'titulo, descricao e categoria_id são obrigatórios');
    const projectSlug = slug(dto.titulo);
    const [result] = await database_1.default.query(`INSERT INTO projetos
       (titulo, slug, descricao, descricao_longa, categoria_id, estado,
        progresso, responsavel, data_inicio, data_fim_prevista, orcamento,
        financiador, publicado, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        dto.titulo, projectSlug, dto.descricao, dto.descricao_longa ?? null,
        dto.categoria_id, dto.estado ?? 'planeamento', dto.progresso ?? 0,
        dto.responsavel ?? null, dto.data_inicio ?? null,
        dto.data_fim_prevista ?? null, dto.orcamento ?? null,
        dto.financiador ?? null, dto.publicado !== false ? 1 : 0,
        req.user.id,
    ]);
    await auditoria(req.user.id, 'criar_projeto', 'projetos', result.insertId, req.ip);
    res.status(201).json({ id: result.insertId, slug: projectSlug });
}
// PUT /api/projetos/:id
async function atualizar(req, res) {
    const id = Number(req.params.id);
    const dto = req.body;
    const [[exist]] = await database_1.default.query('SELECT id FROM projetos WHERE id = ?', [id]);
    if (!exist)
        throw new error_1.HttpError(404, 'Projeto não encontrado');
    const fields = [];
    const values = [];
    const add = (col, val) => { fields.push(`${col} = ?`); values.push(val); };
    if (dto.titulo) {
        add('titulo', dto.titulo);
        add('slug', slug(dto.titulo));
    }
    if (dto.descricao)
        add('descricao', dto.descricao);
    if (dto.descricao_longa !== undefined)
        add('descricao_longa', dto.descricao_longa);
    if (dto.categoria_id)
        add('categoria_id', dto.categoria_id);
    if (dto.estado)
        add('estado', dto.estado);
    if (dto.progresso !== undefined)
        add('progresso', dto.progresso);
    if (dto.responsavel !== undefined)
        add('responsavel', dto.responsavel);
    if (dto.data_inicio !== undefined)
        add('data_inicio', dto.data_inicio);
    if (dto.data_fim_prevista !== undefined)
        add('data_fim_prevista', dto.data_fim_prevista);
    if (dto.orcamento !== undefined)
        add('orcamento', dto.orcamento);
    if (dto.financiador !== undefined)
        add('financiador', dto.financiador);
    if (dto.publicado !== undefined)
        add('publicado', dto.publicado ? 1 : 0);
    if (!fields.length)
        throw new error_1.HttpError(400, 'Nenhum campo para atualizar');
    await database_1.default.query(`UPDATE projetos SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    await auditoria(req.user.id, 'editar_projeto', 'projetos', id, req.ip);
    res.json({ mensagem: 'Projeto atualizado' });
}
// DELETE /api/projetos/:id
async function remover(req, res) {
    const id = Number(req.params.id);
    const [[exist]] = await database_1.default.query('SELECT id FROM projetos WHERE id = ?', [id]);
    if (!exist)
        throw new error_1.HttpError(404, 'Projeto não encontrado');
    await database_1.default.query('DELETE FROM projetos WHERE id = ?', [id]);
    await auditoria(req.user.id, 'remover_projeto', 'projetos', id, req.ip);
    res.json({ mensagem: 'Projeto removido' });
}
// POST /api/projetos/:id/documentos
async function adicionarDocumento(req, res) {
    const projeto_id = Number(req.params.id);
    const { nome, tipo, url, tamanho_kb } = req.body;
    if (!nome || !url)
        throw new error_1.HttpError(400, 'nome e url são obrigatórios');
    const [result] = await database_1.default.query('INSERT INTO projeto_documentos (projeto_id, nome, tipo, url, tamanho_kb) VALUES (?,?,?,?,?)', [projeto_id, nome, tipo ?? 'pdf', url, tamanho_kb ?? null]);
    res.status(201).json({ id: result.insertId });
}
// DELETE /api/projetos/:id/documentos/:docId
async function removerDocumento(req, res) {
    await database_1.default.query('DELETE FROM projeto_documentos WHERE id = ? AND projeto_id = ?', [req.params.docId, req.params.id]);
    res.json({ mensagem: 'Documento removido' });
}
// Util: registar auditoria
async function auditoria(userId, acao, tabela, id, ip) {
    await database_1.default.query('INSERT INTO auditoria (utilizador_id, acao, tabela, registo_id, ip) VALUES (?,?,?,?,?)', [userId, acao, tabela, id, ip ?? null]);
}
//# sourceMappingURL=projetosController.js.map