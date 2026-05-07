import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { HttpError } from '../middleware/error';
import { logger } from '../config/logger';

const JWT_SECRET  = process.env.JWT_SECRET   ?? 'dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';

function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

// ──────────────────────────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────────────────────────

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) throw new HttpError(400, 'Email e password são obrigatórios');

  const [rows] = await pool.query<any[]>(
    'SELECT id, nome, email, password, role, ativo, primeiro_login FROM utilizadores WHERE email = ? LIMIT 1',
    [email],
  );

  const user = rows[0];
  if (!user || !user.ativo) throw new HttpError(401, 'Credenciais inválidas');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new HttpError(401, 'Credenciais inválidas');

  await pool.query('UPDATE utilizadores SET ultimo_login = NOW() WHERE id = ?', [user.id]);

  const primeiroLogin = Boolean(user.primeiro_login);
  const token = signToken({
    id: user.id, email: user.email, role: user.role, primeiro_login: primeiroLogin,
  });

  logger.info(`Login: ${user.email} (${user.role}) primeiro_login=${primeiroLogin}`);

  res.json({
    token,
    primeiro_login: primeiroLogin,
    utilizador: { id: user.id, nome: user.nome, email: user.email, role: user.role },
  });
}

// GET /api/auth/me
export async function me(req: Request, res: Response): Promise<void> {
  const [rows] = await pool.query<any[]>(
    'SELECT id, nome, email, role, primeiro_login, ultimo_login, criado_em FROM utilizadores WHERE id = ?',
    [req.user!.id],
  );
  if (!rows[0]) throw new HttpError(404, 'Utilizador não encontrado');
  res.json({ ...rows[0], primeiro_login: Boolean(rows[0].primeiro_login) });
}

// PUT /api/auth/alterar-password  (utilizador autenticado, sabe a password actual)
export async function alterarPassword(req: Request, res: Response): Promise<void> {
  const { password_atual, password_nova } = req.body as { password_atual: string; password_nova: string };
  if (!password_atual || !password_nova) throw new HttpError(400, 'Preencha ambas as passwords');
  if (password_nova.length < 8)          throw new HttpError(400, 'Mínimo 8 caracteres');

  const [rows] = await pool.query<any[]>('SELECT password FROM utilizadores WHERE id = ?', [req.user!.id]);
  const valid  = await bcrypt.compare(password_atual, rows[0].password);
  if (!valid) throw new HttpError(400, 'Password atual incorreta');

  const hash = await bcrypt.hash(password_nova, 12);
  await pool.query('UPDATE utilizadores SET password=?, primeiro_login=0 WHERE id=?', [hash, req.user!.id]);
  res.json({ mensagem: 'Password alterada com sucesso' });
}

// PUT /api/auth/definir-password  (primeiro login — sem password actual)
export async function definirPassword(req: Request, res: Response): Promise<void> {
  const { password_nova } = req.body as { password_nova: string };
  if (!password_nova || password_nova.length < 8)
    throw new HttpError(400, 'A password deve ter pelo menos 8 caracteres');

  const [rows] = await pool.query<any[]>(
    'SELECT primeiro_login FROM utilizadores WHERE id=?', [req.user!.id],
  );
  if (!rows[0]?.primeiro_login) throw new HttpError(403, 'Operação não permitida');

  const hash = await bcrypt.hash(password_nova, 12);
  await pool.query('UPDATE utilizadores SET password=?, primeiro_login=0 WHERE id=?', [hash, req.user!.id]);

  // Novo token sem flag primeiro_login
  const [u] = await pool.query<any[]>('SELECT id, email, role FROM utilizadores WHERE id=?', [req.user!.id]);
  const token = signToken({ id: u[0].id, email: u[0].email, role: u[0].role, primeiro_login: false });
  res.json({ mensagem: 'Password definida com sucesso', token });
}

// ──────────────────────────────────────────────────────────────
//  GESTÃO DE UTILIZADORES  (admin only)
// ──────────────────────────────────────────────────────────────

// GET /api/utilizadores
export async function listar(req: Request, res: Response): Promise<void> {
  const [rows] = await pool.query<any[]>(
    'SELECT id, nome, email, role, ativo, primeiro_login, ultimo_login, criado_em FROM utilizadores ORDER BY criado_em DESC',
  );
  res.json(rows.map(r => ({ ...r, ativo: Boolean(r.ativo), primeiro_login: Boolean(r.primeiro_login) })));
}

// POST /api/utilizadores
export async function criar(req: Request, res: Response): Promise<void> {
  const { nome, email, role, password_provisoria } = req.body as {
    nome: string; email: string; role: string; password_provisoria: string;
  };

  if (!nome || !email || !role || !password_provisoria)
    throw new HttpError(400, 'nome, email, role e password_provisoria são obrigatórios');

  if (!['admin','editor','viewer'].includes(role))
    throw new HttpError(400, 'Role inválido. Use: admin, editor ou viewer');

  if (password_provisoria.length < 6)
    throw new HttpError(400, 'Password provisória deve ter pelo menos 6 caracteres');

  const hash = await bcrypt.hash(password_provisoria, 12);

  try {
    const [r] = await pool.query<any>(
      'INSERT INTO utilizadores (nome, email, password, role, ativo, primeiro_login) VALUES (?,?,?,?,1,1)',
      [nome, email, hash, role],
    );
    logger.info(`Novo utilizador: ${email} (${role}) criado por id=${req.user!.id}`);
    res.status(201).json({
      id: r.insertId,
      mensagem: 'Utilizador criado. Deverá alterar a password no primeiro login.',
    });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Este email já está registado');
    throw e;
  }
}

// PUT /api/utilizadores/:id
export async function atualizar(req: Request, res: Response): Promise<void> {
  const id  = Number(req.params.id);
  const dto = req.body as { nome?: string; email?: string; role?: string; ativo?: boolean };

  if (req.user!.id === id && dto.ativo === false)
    throw new HttpError(400, 'Não pode desativar a sua própria conta');

  const fields: string[] = []; const vals: unknown[] = [];
  const add = (c: string, v: unknown) => { fields.push(`${c}=?`); vals.push(v); };

  if (dto.nome  !== undefined) add('nome',  dto.nome);
  if (dto.email !== undefined) add('email', dto.email);
  if (dto.role  !== undefined) {
    if (!['admin','editor','viewer'].includes(dto.role)) throw new HttpError(400, 'Role inválido');
    add('role', dto.role);
  }
  if (dto.ativo !== undefined) add('ativo', dto.ativo ? 1 : 0);

  if (!fields.length) throw new HttpError(400, 'Nenhum campo para atualizar');

  await pool.query(`UPDATE utilizadores SET ${fields.join(',')} WHERE id=?`, [...vals, id]);
  res.json({ mensagem: 'Utilizador atualizado' });
}

// POST /api/utilizadores/:id/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { password_provisoria } = req.body as { password_provisoria: string };

  if (!password_provisoria || password_provisoria.length < 6)
    throw new HttpError(400, 'Password provisória deve ter pelo menos 6 caracteres');

  const hash = await bcrypt.hash(password_provisoria, 12);
  await pool.query('UPDATE utilizadores SET password=?, primeiro_login=1 WHERE id=?', [hash, id]);

  logger.info(`Password reset utilizador id=${id} por admin id=${req.user!.id}`);
  res.json({ mensagem: 'Password redefinida. O utilizador deverá alterar no próximo login.' });
}

// DELETE /api/utilizadores/:id  (desativa, nunca apaga)
export async function remover(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (req.user!.id === id) throw new HttpError(400, 'Não pode remover a sua própria conta');
  await pool.query('UPDATE utilizadores SET ativo=0 WHERE id=?', [id]);
  res.json({ mensagem: 'Utilizador desativado' });
}