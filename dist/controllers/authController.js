"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
exports.alterarPassword = alterarPassword;
exports.definirPassword = definirPassword;
exports.listar = listar;
exports.criar = criar;
exports.atualizar = atualizar;
exports.resetPassword = resetPassword;
exports.remover = remover;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const error_1 = require("../middleware/error");
const logger_1 = require("../config/logger");
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
// ──────────────────────────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────────────────────────
// POST /api/auth/login
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password)
        throw new error_1.HttpError(400, 'Email e password são obrigatórios');
    const [rows] = await database_1.default.query('SELECT id, nome, email, password, role, ativo, primeiro_login FROM utilizadores WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    if (!user || !user.ativo)
        throw new error_1.HttpError(401, 'Credenciais inválidas');
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        throw new error_1.HttpError(401, 'Credenciais inválidas');
    await database_1.default.query('UPDATE utilizadores SET ultimo_login = NOW() WHERE id = ?', [user.id]);
    const primeiroLogin = Boolean(user.primeiro_login);
    const token = signToken({
        id: user.id, email: user.email, role: user.role, primeiro_login: primeiroLogin,
    });
    logger_1.logger.info(`Login: ${user.email} (${user.role}) primeiro_login=${primeiroLogin}`);
    res.json({
        token,
        primeiro_login: primeiroLogin,
        utilizador: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    });
}
// GET /api/auth/me
async function me(req, res) {
    const [rows] = await database_1.default.query('SELECT id, nome, email, role, primeiro_login, ultimo_login, criado_em FROM utilizadores WHERE id = ?', [req.user.id]);
    if (!rows[0])
        throw new error_1.HttpError(404, 'Utilizador não encontrado');
    res.json({ ...rows[0], primeiro_login: Boolean(rows[0].primeiro_login) });
}
// PUT /api/auth/alterar-password  (utilizador autenticado, sabe a password actual)
async function alterarPassword(req, res) {
    const { password_atual, password_nova } = req.body;
    if (!password_atual || !password_nova)
        throw new error_1.HttpError(400, 'Preencha ambas as passwords');
    if (password_nova.length < 8)
        throw new error_1.HttpError(400, 'Mínimo 8 caracteres');
    const [rows] = await database_1.default.query('SELECT password FROM utilizadores WHERE id = ?', [req.user.id]);
    const valid = await bcryptjs_1.default.compare(password_atual, rows[0].password);
    if (!valid)
        throw new error_1.HttpError(400, 'Password atual incorreta');
    const hash = await bcryptjs_1.default.hash(password_nova, 12);
    await database_1.default.query('UPDATE utilizadores SET password=?, primeiro_login=0 WHERE id=?', [hash, req.user.id]);
    res.json({ mensagem: 'Password alterada com sucesso' });
}
// PUT /api/auth/definir-password  (primeiro login — sem password actual)
async function definirPassword(req, res) {
    const { password_nova } = req.body;
    if (!password_nova || password_nova.length < 8)
        throw new error_1.HttpError(400, 'A password deve ter pelo menos 8 caracteres');
    const [rows] = await database_1.default.query('SELECT primeiro_login FROM utilizadores WHERE id=?', [req.user.id]);
    if (!rows[0]?.primeiro_login)
        throw new error_1.HttpError(403, 'Operação não permitida');
    const hash = await bcryptjs_1.default.hash(password_nova, 12);
    await database_1.default.query('UPDATE utilizadores SET password=?, primeiro_login=0 WHERE id=?', [hash, req.user.id]);
    // Novo token sem flag primeiro_login
    const [u] = await database_1.default.query('SELECT id, email, role FROM utilizadores WHERE id=?', [req.user.id]);
    const token = signToken({ id: u[0].id, email: u[0].email, role: u[0].role, primeiro_login: false });
    res.json({ mensagem: 'Password definida com sucesso', token });
}
// ──────────────────────────────────────────────────────────────
//  GESTÃO DE UTILIZADORES  (admin only)
// ──────────────────────────────────────────────────────────────
// GET /api/utilizadores
async function listar(req, res) {
    const [rows] = await database_1.default.query('SELECT id, nome, email, role, ativo, primeiro_login, ultimo_login, criado_em FROM utilizadores ORDER BY criado_em DESC');
    res.json(rows.map(r => ({ ...r, ativo: Boolean(r.ativo), primeiro_login: Boolean(r.primeiro_login) })));
}
// POST /api/utilizadores
async function criar(req, res) {
    const { nome, email, role, password_provisoria } = req.body;
    if (!nome || !email || !role || !password_provisoria)
        throw new error_1.HttpError(400, 'nome, email, role e password_provisoria são obrigatórios');
    if (!['admin', 'editor', 'viewer'].includes(role))
        throw new error_1.HttpError(400, 'Role inválido. Use: admin, editor ou viewer');
    if (password_provisoria.length < 6)
        throw new error_1.HttpError(400, 'Password provisória deve ter pelo menos 6 caracteres');
    const hash = await bcryptjs_1.default.hash(password_provisoria, 12);
    try {
        const [r] = await database_1.default.query('INSERT INTO utilizadores (nome, email, password, role, ativo, primeiro_login) VALUES (?,?,?,?,1,1)', [nome, email, hash, role]);
        logger_1.logger.info(`Novo utilizador: ${email} (${role}) criado por id=${req.user.id}`);
        res.status(201).json({
            id: r.insertId,
            mensagem: 'Utilizador criado. Deverá alterar a password no primeiro login.',
        });
    }
    catch (e) {
        if (e.code === 'ER_DUP_ENTRY')
            throw new error_1.HttpError(409, 'Este email já está registado');
        throw e;
    }
}
// PUT /api/utilizadores/:id
async function atualizar(req, res) {
    const id = Number(req.params.id);
    const dto = req.body;
    if (req.user.id === id && dto.ativo === false)
        throw new error_1.HttpError(400, 'Não pode desativar a sua própria conta');
    const fields = [];
    const vals = [];
    const add = (c, v) => { fields.push(`${c}=?`); vals.push(v); };
    if (dto.nome !== undefined)
        add('nome', dto.nome);
    if (dto.email !== undefined)
        add('email', dto.email);
    if (dto.role !== undefined) {
        if (!['admin', 'editor', 'viewer'].includes(dto.role))
            throw new error_1.HttpError(400, 'Role inválido');
        add('role', dto.role);
    }
    if (dto.ativo !== undefined)
        add('ativo', dto.ativo ? 1 : 0);
    if (!fields.length)
        throw new error_1.HttpError(400, 'Nenhum campo para atualizar');
    await database_1.default.query(`UPDATE utilizadores SET ${fields.join(',')} WHERE id=?`, [...vals, id]);
    res.json({ mensagem: 'Utilizador atualizado' });
}
// POST /api/utilizadores/:id/reset-password
async function resetPassword(req, res) {
    const id = Number(req.params.id);
    const { password_provisoria } = req.body;
    if (!password_provisoria || password_provisoria.length < 6)
        throw new error_1.HttpError(400, 'Password provisória deve ter pelo menos 6 caracteres');
    const hash = await bcryptjs_1.default.hash(password_provisoria, 12);
    await database_1.default.query('UPDATE utilizadores SET password=?, primeiro_login=1 WHERE id=?', [hash, id]);
    logger_1.logger.info(`Password reset utilizador id=${id} por admin id=${req.user.id}`);
    res.json({ mensagem: 'Password redefinida. O utilizador deverá alterar no próximo login.' });
}
// DELETE /api/utilizadores/:id  (desativa, nunca apaga)
async function remover(req, res) {
    const id = Number(req.params.id);
    if (req.user.id === id)
        throw new error_1.HttpError(400, 'Não pode remover a sua própria conta');
    await database_1.default.query('UPDATE utilizadores SET ativo=0 WHERE id=?', [id]);
    res.json({ mensagem: 'Utilizador desativado' });
}
//# sourceMappingURL=authController.js.map