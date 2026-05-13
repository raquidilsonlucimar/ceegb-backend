"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarRelatorios = listarRelatorios;
exports.criarRelatorio = criarRelatorio;
exports.obterRelatorio = obterRelatorio;
exports.atualizarRelatorio = atualizarRelatorio;
exports.removerRelatorio = removerRelatorio;
exports.incrementarDownload = incrementarDownload;
exports.listarNoticias = listarNoticias;
exports.obterNoticia = obterNoticia;
exports.criarNoticia = criarNoticia;
exports.atualizarNoticia = atualizarNoticia;
exports.removerNoticia = removerNoticia;
exports.listarEquipa = listarEquipa;
exports.criarMembro = criarMembro;
exports.atualizarMembro = atualizarMembro;
exports.removerMembro = removerMembro;
exports.listarMensagens = listarMensagens;
exports.criarMensagem = criarMensagem;
exports.marcarLida = marcarLida;
exports.removerMensagem = removerMensagem;
exports.listarIndicadores = listarIndicadores;
exports.atualizarIndicador = atualizarIndicador;
exports.listarCategorias = listarCategorias;
exports.dashboard = dashboard;
const slugify_1 = __importDefault(require("slugify"));
const database_1 = __importDefault(require("../config/database"));
const error_1 = require("../middleware/error");
const slug = (s) => (0, slugify_1.default)(s, { lower: true, strict: true, locale: 'pt' });
// ══════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ══════════════════════════════════════════════════════════════
async function listarRelatorios(req, res) {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 10));
    const offset = (page - 1) * limit;
    const [[{ total }]] = await database_1.default.query(`SELECT COUNT(*) AS total FROM relatorios WHERE ${req.user ? '1=1' : 'publicado=1'}`);
    const [rows] = await database_1.default.query(`SELECT r.*, c.nome AS categoria_nome
       FROM relatorios r
       LEFT JOIN categorias c ON c.id = r.categoria_id
       ${req.user ? '' : 'WHERE r.publicado = 1'}
       ORDER BY r.data_publicacao DESC
       LIMIT ? OFFSET ?`, [limit, offset]);
    res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}
async function criarRelatorio(req, res) {
    const dto = req.body;
    if (!dto.titulo || !dto.categoria_id || !dto.data_publicacao)
        throw new error_1.HttpError(400, 'titulo, categoria_id e data_publicacao são obrigatórios');
    const [r] = await database_1.default.query(`INSERT INTO relatorios
       (titulo, slug, resumo, conteudo, categoria_id, url_documento,
        data_publicacao, publicado, destaque, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`, [
        dto.titulo, slug(dto.titulo), dto.resumo ?? null, dto.conteudo ?? null,
        dto.categoria_id, dto.url_documento ?? null, dto.data_publicacao,
        dto.publicado !== false ? 1 : 0, dto.destaque ? 1 : 0, req.user.id,
    ]);
    res.status(201).json({ id: r.insertId });
}
async function obterRelatorio(req, res) {
    const [[r]] = await database_1.default.query(`SELECT r.*, c.nome AS categoria_nome
       FROM relatorios r
       LEFT JOIN categorias c ON c.id = r.categoria_id
       WHERE r.id = ? LIMIT 1`, [req.params.id]);
    if (!r)
        throw new error_1.HttpError(404, 'Relatório não encontrado');
    res.json(r);
}
async function atualizarRelatorio(req, res) {
    const id = Number(req.params.id);
    const dto = req.body;
    const fields = [];
    const values = [];
    const add = (c, v) => { fields.push(`${c}=?`); values.push(v); };
    if (dto.titulo) {
        add('titulo', dto.titulo);
        add('slug', slug(dto.titulo));
    }
    if (dto.resumo !== undefined)
        add('resumo', dto.resumo);
    if (dto.conteudo !== undefined)
        add('conteudo', dto.conteudo);
    if (dto.categoria_id)
        add('categoria_id', dto.categoria_id);
    if (dto.url_documento !== undefined)
        add('url_documento', dto.url_documento);
    if (dto.data_publicacao)
        add('data_publicacao', dto.data_publicacao);
    if (dto.publicado !== undefined)
        add('publicado', dto.publicado ? 1 : 0);
    if (dto.destaque !== undefined)
        add('destaque', dto.destaque ? 1 : 0);
    if (!fields.length)
        throw new error_1.HttpError(400, 'Nenhum campo para atualizar');
    await database_1.default.query(`UPDATE relatorios SET ${fields.join(',')} WHERE id=?`, [...values, id]);
    res.json({ mensagem: 'Relatório atualizado' });
}
async function removerRelatorio(req, res) {
    await database_1.default.query('DELETE FROM relatorios WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Relatório removido' });
}
async function incrementarDownload(req, res) {
    await database_1.default.query('UPDATE relatorios SET downloads = downloads + 1 WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Download registado' });
}
// ══════════════════════════════════════════════════════════════
//  NOTÍCIAS
// ══════════════════════════════════════════════════════════════
async function listarNoticias(req, res) {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 10));
    const offset = (page - 1) * limit;
    const pub = req.user ? '' : 'WHERE publicado=1';
    const [[{ total }]] = await database_1.default.query(`SELECT COUNT(*) AS total FROM noticias ${pub}`);
    const [rows] = await database_1.default.query(`SELECT * FROM noticias ${pub} ORDER BY data_publicacao DESC LIMIT ? OFFSET ?`, [limit, offset]);
    res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}
async function obterNoticia(req, res) {
    const [[noticia]] = await database_1.default.query('SELECT * FROM noticias WHERE slug=? LIMIT 1', [req.params.slug]);
    if (!noticia)
        throw new error_1.HttpError(404, 'Notícia não encontrada');
    // Incrementar visualizações
    await database_1.default.query('UPDATE noticias SET visualizacoes = visualizacoes + 1 WHERE id=?', [noticia.id]);
    res.json(noticia);
}
async function criarNoticia(req, res) {
    const dto = req.body;
    if (!dto.titulo || !dto.conteudo || !dto.data_publicacao)
        throw new error_1.HttpError(400, 'titulo, conteudo e data_publicacao são obrigatórios');
    const [r] = await database_1.default.query(`INSERT INTO noticias
       (titulo, slug, resumo, conteudo, imagem_url, destaque, publicado, data_publicacao, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?)`, [
        dto.titulo, slug(dto.titulo), dto.resumo ?? null, dto.conteudo,
        dto.imagem_url ?? null, dto.destaque ? 1 : 0,
        dto.publicado !== false ? 1 : 0, dto.data_publicacao, req.user.id,
    ]);
    res.status(201).json({ id: r.insertId });
}
async function atualizarNoticia(req, res) {
    const id = Number(req.params.id);
    const dto = req.body;
    const fields = [];
    const values = [];
    const add = (c, v) => { fields.push(`${c}=?`); values.push(v); };
    if (dto.titulo) {
        add('titulo', dto.titulo);
        add('slug', slug(dto.titulo));
    }
    if (dto.resumo !== undefined)
        add('resumo', dto.resumo);
    if (dto.conteudo)
        add('conteudo', dto.conteudo);
    if (dto.imagem_url !== undefined)
        add('imagem_url', dto.imagem_url);
    if (dto.destaque !== undefined)
        add('destaque', dto.destaque ? 1 : 0);
    if (dto.publicado !== undefined)
        add('publicado', dto.publicado ? 1 : 0);
    if (dto.data_publicacao)
        add('data_publicacao', dto.data_publicacao);
    if (!fields.length)
        throw new error_1.HttpError(400, 'Nenhum campo para atualizar');
    await database_1.default.query(`UPDATE noticias SET ${fields.join(',')} WHERE id=?`, [...values, id]);
    res.json({ mensagem: 'Notícia atualizada' });
}
async function removerNoticia(req, res) {
    await database_1.default.query('DELETE FROM noticias WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Notícia removida' });
}
// ══════════════════════════════════════════════════════════════
//  EQUIPA
// ══════════════════════════════════════════════════════════════
async function listarEquipa(req, res) {
    const [rows] = await database_1.default.query('SELECT * FROM equipa WHERE ativo=1 ORDER BY ordem, nome');
    res.json(rows);
}
async function criarMembro(req, res) {
    const dto = req.body;
    if (!dto.nome || !dto.cargo)
        throw new error_1.HttpError(400, 'nome e cargo são obrigatórios');
    const [r] = await database_1.default.query(`INSERT INTO equipa (nome, cargo, bio, email, telefone, linkedin, cor_avatar, ordem)
     VALUES (?,?,?,?,?,?,?,?)`, [
        dto.nome, dto.cargo, dto.bio ?? null, dto.email ?? null,
        dto.telefone ?? null, dto.linkedin ?? null,
        dto.cor_avatar ?? '#142240', dto.ordem ?? 0,
    ]);
    res.status(201).json({ id: r.insertId });
}
async function atualizarMembro(req, res) {
    const dto = req.body;
    const fields = [];
    const values = [];
    const add = (c, v) => { fields.push(`${c}=?`); values.push(v); };
    if (dto.nome)
        add('nome', dto.nome);
    if (dto.cargo)
        add('cargo', dto.cargo);
    if (dto.bio !== undefined)
        add('bio', dto.bio);
    if (dto.email !== undefined)
        add('email', dto.email);
    if (dto.telefone !== undefined)
        add('telefone', dto.telefone);
    if (dto.linkedin !== undefined)
        add('linkedin', dto.linkedin);
    if (dto.cor_avatar)
        add('cor_avatar', dto.cor_avatar);
    if (dto.ordem !== undefined)
        add('ordem', dto.ordem);
    if (!fields.length)
        throw new error_1.HttpError(400, 'Nenhum campo para atualizar');
    await database_1.default.query(`UPDATE equipa SET ${fields.join(',')} WHERE id=?`, [...values, req.params.id]);
    res.json({ mensagem: 'Membro atualizado' });
}
async function removerMembro(req, res) {
    await database_1.default.query('UPDATE equipa SET ativo=0 WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Membro desativado' });
}
// ══════════════════════════════════════════════════════════════
//  MENSAGENS
// ══════════════════════════════════════════════════════════════
async function listarMensagens(req, res) {
    const naoLidas = req.query.nao_lidas === '1';
    const where = naoLidas ? 'WHERE lida=0' : '';
    const [rows] = await database_1.default.query(`SELECT * FROM mensagens ${where} ORDER BY criado_em DESC`);
    res.json(rows);
}
async function criarMensagem(req, res) {
    const dto = req.body;
    if (!dto.nome || !dto.email || !dto.assunto || !dto.mensagem)
        throw new error_1.HttpError(400, 'nome, email, assunto e mensagem são obrigatórios');
    // Validação simples de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email))
        throw new error_1.HttpError(400, 'Email inválido');
    const [r] = await database_1.default.query(`INSERT INTO mensagens (nome, email, telefone, organizacao, assunto, mensagem, ip_origem)
     VALUES (?,?,?,?,?,?,?)`, [
        dto.nome, dto.email, dto.telefone ?? null,
        dto.organizacao ?? null, dto.assunto, dto.mensagem, req.ip ?? null,
    ]);
    res.status(201).json({ id: r.insertId, mensagem: 'Mensagem enviada com sucesso' });
}
async function marcarLida(req, res) {
    await database_1.default.query('UPDATE mensagens SET lida=1 WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Marcada como lida' });
}
async function removerMensagem(req, res) {
    await database_1.default.query('DELETE FROM mensagens WHERE id=?', [req.params.id]);
    res.json({ mensagem: 'Mensagem removida' });
}
// ══════════════════════════════════════════════════════════════
//  INDICADORES DE MERCADO
// ══════════════════════════════════════════════════════════════
async function listarIndicadores(req, res) {
    const [rows] = await database_1.default.query('SELECT * FROM indicadores_mercado WHERE ativo=1 ORDER BY ordem');
    res.json(rows);
}
async function atualizarIndicador(req, res) {
    const { valor, descricao } = req.body;
    await database_1.default.query('UPDATE indicadores_mercado SET valor=?, descricao=? WHERE id=?', [valor, descricao ?? null, req.params.id]);
    res.json({ mensagem: 'Indicador atualizado' });
}
// ══════════════════════════════════════════════════════════════
//  CATEGORIAS
// ══════════════════════════════════════════════════════════════
async function listarCategorias(req, res) {
    const tipo = req.query.tipo;
    const [rows] = await database_1.default.query(`SELECT * FROM categorias ${tipo ? 'WHERE tipo=?' : ''} ORDER BY nome`, tipo ? [tipo] : []);
    res.json(rows);
}
// ══════════════════════════════════════════════════════════════
//  DASHBOARD (resumo para admin)
// ══════════════════════════════════════════════════════════════
async function dashboard(req, res) {
    const [[projetos]] = await database_1.default.query('SELECT COUNT(*) AS total, SUM(estado="ativo") AS ativos FROM projetos');
    const [[relatorios]] = await database_1.default.query('SELECT COUNT(*) AS total FROM relatorios');
    const [[noticias]] = await database_1.default.query('SELECT COUNT(*) AS total FROM noticias');
    const [[mensagens]] = await database_1.default.query('SELECT COUNT(*) AS total, SUM(lida=0) AS nao_lidas FROM mensagens');
    const [[equipa]] = await database_1.default.query('SELECT COUNT(*) AS total FROM equipa WHERE ativo=1');
    const [recentes] = await database_1.default.query(`SELECT 'projeto' AS tipo, titulo, criado_em FROM projetos
     UNION ALL
     SELECT 'noticia', titulo, criado_em FROM noticias
     ORDER BY criado_em DESC LIMIT 5`);
    res.json({ projetos, relatorios, noticias, mensagens, equipa, recentes });
}
//# sourceMappingURL=contentController.js.map