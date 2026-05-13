-- ============================================================
--  CEEGB — Base de Dados MySQL
--  Versão: 1.0.0
--  Charset: utf8mb4 | Engine: InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS ceegb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ceegb;

-- ── UTILIZADORES (Admin) ─────────────────────────────────────
CREATE TABLE utilizadores (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120)        NOT NULL,
  email       VARCHAR(180)        NOT NULL UNIQUE,
  password    VARCHAR(255)        NOT NULL,          -- bcrypt hash
  role        ENUM('admin','editor','viewer') NOT NULL DEFAULT 'editor',
  ativo       TINYINT(1)          NOT NULL DEFAULT 1,
  ultimo_login DATETIME           NULL,
  criado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── CATEGORIAS ───────────────────────────────────────────────
CREATE TABLE categorias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(80)         NOT NULL UNIQUE,
  slug        VARCHAR(80)         NOT NULL UNIQUE,
  tipo        ENUM('projeto','relatorio','noticia') NOT NULL,
  criado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── PROJETOS ─────────────────────────────────────────────────
CREATE TABLE projetos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(220)        NOT NULL,
  slug          VARCHAR(220)        NOT NULL UNIQUE,
  descricao     TEXT                NOT NULL,
  descricao_longa TEXT              NULL,
  categoria_id  INT UNSIGNED        NOT NULL,
  estado        ENUM('planeamento','ativo','suspenso','concluido') NOT NULL DEFAULT 'planeamento',
  progresso     TINYINT UNSIGNED    NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  responsavel   VARCHAR(120)        NULL,
  data_inicio   DATE                NULL,
  data_fim_prevista DATE            NULL,
  data_conclusao DATE               NULL,
  orcamento     DECIMAL(15,2)       NULL,
  financiador   VARCHAR(180)        NULL,
  publicado     TINYINT(1)          NOT NULL DEFAULT 1,
  criado_por    INT UNSIGNED        NULL,
  criado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projeto_cat    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  CONSTRAINT fk_projeto_user   FOREIGN KEY (criado_por)   REFERENCES utilizadores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_projetos_estado    ON projetos (estado);
CREATE INDEX idx_projetos_categoria ON projetos (categoria_id);
CREATE INDEX idx_projetos_publicado ON projetos (publicado);

-- ── DOCUMENTOS DOS PROJETOS ───────────────────────────────────
CREATE TABLE projeto_documentos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  projeto_id  INT UNSIGNED        NOT NULL,
  nome        VARCHAR(200)        NOT NULL,
  tipo        ENUM('pdf','xlsx','docx','csv','outro') NOT NULL DEFAULT 'pdf',
  url         VARCHAR(500)        NOT NULL,
  tamanho_kb  INT UNSIGNED        NULL,
  criado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doc_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_doc_projeto ON projeto_documentos (projeto_id);

-- ── RELATÓRIOS ───────────────────────────────────────────────
CREATE TABLE relatorios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(300)        NOT NULL,
  slug          VARCHAR(300)        NOT NULL UNIQUE,
  resumo        TEXT                NULL,
  conteudo      LONGTEXT            NULL,
  categoria_id  INT UNSIGNED        NOT NULL,
  url_documento VARCHAR(500)        NULL,
  data_publicacao DATE              NOT NULL,
  publicado     TINYINT(1)          NOT NULL DEFAULT 1,
  destaque      TINYINT(1)          NOT NULL DEFAULT 0,
  downloads     INT UNSIGNED        NOT NULL DEFAULT 0,
  criado_por    INT UNSIGNED        NULL,
  criado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rel_cat  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
  CONSTRAINT fk_rel_user FOREIGN KEY (criado_por)   REFERENCES utilizadores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_relatorios_cat       ON relatorios (categoria_id);
CREATE INDEX idx_relatorios_publicado ON relatorios (publicado, data_publicacao);

-- ── NOTÍCIAS ─────────────────────────────────────────────────
CREATE TABLE noticias (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(300)        NOT NULL,
  slug          VARCHAR(300)        NOT NULL UNIQUE,
  resumo        VARCHAR(500)        NULL,
  conteudo      LONGTEXT            NOT NULL,
  imagem_url    VARCHAR(500)        NULL,
  destaque      TINYINT(1)          NOT NULL DEFAULT 0,
  publicado     TINYINT(1)          NOT NULL DEFAULT 1,
  data_publicacao DATE              NOT NULL,
  visualizacoes INT UNSIGNED        NOT NULL DEFAULT 0,
  criado_por    INT UNSIGNED        NULL,
  criado_em     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_noticia_user FOREIGN KEY (criado_por) REFERENCES utilizadores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_noticias_publicado ON noticias (publicado, data_publicacao);
CREATE INDEX idx_noticias_destaque  ON noticias (destaque);

-- ── EQUIPA ───────────────────────────────────────────────────
CREATE TABLE equipa (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120)        NOT NULL,
  cargo       VARCHAR(160)        NOT NULL,
  bio         TEXT                NULL,
  email       VARCHAR(180)        NULL,
  telefone    VARCHAR(30)         NULL,
  linkedin    VARCHAR(300)        NULL,
  foto_url    VARCHAR(500)        NULL,
  cor_avatar  VARCHAR(10)         NOT NULL DEFAULT '#142240',
  ordem       TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  ativo       TINYINT(1)          NOT NULL DEFAULT 1,
  criado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_equipa_ordem ON equipa (ordem, ativo);

-- ── MENSAGENS DE CONTACTO ────────────────────────────────────
CREATE TABLE mensagens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120)        NOT NULL,
  email       VARCHAR(180)        NOT NULL,
  telefone    VARCHAR(30)         NULL,
  organizacao VARCHAR(200)        NULL,
  assunto     VARCHAR(200)        NOT NULL,
  mensagem    TEXT                NOT NULL,
  lida        TINYINT(1)          NOT NULL DEFAULT 0,
  respondida  TINYINT(1)          NOT NULL DEFAULT 0,
  ip_origem   VARCHAR(45)         NULL,
  criado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_mensagens_lida ON mensagens (lida, criado_em);

-- ── MERCADO DE ENERGIA (Indicadores) ─────────────────────────
CREATE TABLE indicadores_mercado (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120)        NOT NULL,
  valor       VARCHAR(60)         NOT NULL,
  unidade     VARCHAR(40)         NULL,
  descricao   VARCHAR(300)        NULL,
  icone       VARCHAR(10)         NULL,
  ordem       TINYINT UNSIGNED    NOT NULL DEFAULT 0,
  ativo       TINYINT(1)          NOT NULL DEFAULT 1,
  atualizado_em DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── PÁGINAS DE CONTEÚDO (CMS simples) ───────────────────────
CREATE TABLE paginas (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(80)         NOT NULL UNIQUE,
  titulo      VARCHAR(200)        NOT NULL,
  conteudo    LONGTEXT            NULL,
  meta_desc   VARCHAR(300)        NULL,
  atualizado_em DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── AUDITORIA (log de ações admin) ───────────────────────────
CREATE TABLE auditoria (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizador_id INT UNSIGNED     NULL,
  acao          VARCHAR(80)      NOT NULL,   -- ex: 'criar_projeto', 'editar_noticia'
  tabela        VARCHAR(60)      NULL,
  registo_id    INT UNSIGNED     NULL,
  detalhe       JSON             NULL,
  ip            VARCHAR(45)      NULL,
  criado_em     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_auditoria_user ON auditoria (utilizador_id, criado_em);

-- ============================================================
--  TRIGGERS
-- ============================================================

DELIMITER $$

-- Auto-gerar slug de projeto a partir do título
CREATE TRIGGER trg_projeto_slug
BEFORE INSERT ON projetos FOR EACH ROW
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    SET NEW.slug = LOWER(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        NEW.titulo, ' ', '-'), 'ã', 'a'), 'ç', 'c'), 'é', 'e'), 'ó', 'o')
    );
  END IF;
END$$

-- Incrementar contador de downloads
CREATE TRIGGER trg_relatorio_download
BEFORE UPDATE ON relatorios FOR EACH ROW
BEGIN
  IF NEW.downloads > OLD.downloads THEN
    SET NEW.atualizado_em = CURRENT_TIMESTAMP;
  END IF;
END$$

DELIMITER ;

-- ============================================================
--  DADOS INICIAIS (SEED)
-- ============================================================

-- Admin padrão  (password: Admin@2024 — bcrypt hash)
INSERT INTO utilizadores (nome, email, password, role) VALUES
('Administrador', 'admin@ceegb.gw',
 '$2a$12$M1/W/fK00SaSf1H.JJIBl.PzsVyMRZV1AcKRsJsybgErpCZHw7hCG', 'admin');

-- Categorias
INSERT INTO categorias (nome, slug, tipo) VALUES
('Eletricidade',          'eletricidade',        'projeto'),
('Eletrificação Rural',   'eletrificacao-rural', 'projeto'),
('Combustíveis Fósseis',  'combustiveis-fosseis','projeto'),
('Energias Renováveis',   'energias-renovaveis', 'projeto'),
('Mercado',               'mercado',             'relatorio'),
('Geral',                 'geral',               'relatorio');

-- Projetos de exemplo
INSERT INTO projetos (titulo, slug, descricao, categoria_id, estado, progresso, responsavel, data_inicio, financiador, publicado, criado_por) VALUES
('Eletrificação de Gabu e Bafatá',
 'eletrificacao-gabu-bafata',
 'Extensão da rede elétrica de média tensão para os centros urbanos de Gabu e Bafatá, beneficiando cerca de 45 000 habitantes.',
 1, 'ativo', 65, 'Eng. Mamadú Baldé', '2024-01-15', 'Banco Africano de Desenvolvimento', 1, 1),

('Auditoria Energética EAGB 2024',
 'auditoria-energetica-eagb-2024',
 'Auditoria técnica e financeira à Empresa de Eletricidade e Águas da Guiné-Bissau.',
 1, 'ativo', 40, 'Dra. Fátima Sanhá', '2024-03-01', 'União Europeia', 1, 1),

('Estudo Offshore Bloco 3',
 'estudo-offshore-bloco-3',
 'Estudo geofísico e análise de potencial petrolífero no bloco 3 da ZEE da Guiné-Bissau.',
 3, 'planeamento', 15, 'Dr. Carlos Mendes', '2024-06-01', 'PNUD', 1, 1),

('Mini-rede Solar Cacheu',
 'mini-rede-solar-cacheu',
 'Instalação de sistema solar fotovoltaico com bateria para 12 tabancas da região de Cacheu.',
 2, 'concluido', 100, 'Eng. Mamadú Baldé', '2023-01-10', 'Banco Mundial', 1, 1);

-- Documentos dos projetos
INSERT INTO projeto_documentos (projeto_id, nome, tipo, url, tamanho_kb) VALUES
(1, 'Plano de Execução', 'pdf', '/docs/projetos/gabu-plano.pdf', 1240),
(1, 'Estudo de Viabilidade', 'pdf', '/docs/projetos/gabu-viabilidade.pdf', 890),
(2, 'Termos de Referência', 'pdf', '/docs/projetos/eagb-tor.pdf', 540),
(4, 'Relatório Final', 'pdf', '/docs/projetos/cacheu-final.pdf', 2100),
(4, 'Manual de Operação', 'pdf', '/docs/projetos/cacheu-manual.pdf', 780);

-- Relatórios
INSERT INTO relatorios (titulo, slug, resumo, categoria_id, data_publicacao, publicado, destaque, criado_por) VALUES
('Análise do Setor Elétrico — 1.º Semestre 2024',
 'analise-setor-eletrico-s1-2024',
 'Panorama do setor elétrico nacional com indicadores de produção, distribuição e tarifas.',
 1, '2024-08-10', 1, 1, 1),

('Mercado de Combustíveis CEDEAO 2024',
 'mercado-combustiveis-cedeao-2024',
 'Análise comparativa dos preços e disponibilidade de combustíveis na região da CEDEAO.',
 5, '2024-07-22', 1, 0, 1),

('Potencial de Eletrificação Rural — Diagnóstico Nacional',
 'potencial-eletrificacao-rural-diagnostico',
 'Mapeamento das zonas sem acesso à eletricidade e estimativa de custos de eletrificação.',
 2, '2024-05-15', 1, 0, 1);

-- Notícias
INSERT INTO noticias (titulo, slug, resumo, conteudo, destaque, data_publicacao, publicado, criado_por) VALUES
('Guiné-Bissau recebe financiamento de €45M para expansão elétrica',
 'financiamento-45m-expansao-eletrica',
 'O Banco Africano de Desenvolvimento aprovou um pacote de financiamento para a expansão da infraestrutura elétrica nacional.',
 'O Banco Africano de Desenvolvimento aprovou um pacote de financiamento no valor de 45 milhões de euros destinado à expansão e modernização da infraestrutura elétrica da Guiné-Bissau. O projeto abrangerá as regiões de Gabu, Bafatá e Oio.',
 1, '2024-10-12', 1, 1),

('Workshop Regional sobre Energias Renováveis realizado em Bissau',
 'workshop-energias-renovaveis-bissau',
 'O CEEGB organizou um workshop com especialistas de 8 países da CEDEAO.',
 'Reuniram-se em Bissau especialistas do setor energético provenientes de 8 países membros da CEDEAO para debater estratégias de integração das energias renováveis nos sistemas elétricos nacionais.',
 0, '2024-09-28', 1, 1),

('Novo relatório sobre o mercado de GNL na África Ocidental',
 'relatorio-gnl-africa-ocidental',
 'Publicamos um relatório abrangente sobre as oportunidades do GNL para a região.',
 'O CEEGB publicou um relatório técnico que mapeia as oportunidades de desenvolvimento do mercado de Gás Natural Liquefeito (GNL) na África Ocidental, com foco nos países sem litoral.',
 0, '2024-09-10', 1, 1);

-- Equipa
INSERT INTO equipa (nome, cargo, bio, email, cor_avatar, ordem) VALUES
('Dr. Amílcar Vaz',    'Director Executivo',             'Economista com 20 anos de experiência no setor energético africano. Ex-consultor do Banco Mundial.', 'amilcar@ceegb.gw',  '#142240', 1),
('Eng. Mamadú Baldé',  'Engenheiro Sénior — Eletricidade','Engenheiro eletrotécnico especializado em redes de distribuição e energias renováveis.',             'mamadu@ceegb.gw',   '#1a4fa0', 2),
('Dra. Fátima Sanhá',  'Especialista em Regulação',      'Jurista especializada em regulação energética e contratos de concessão.',                            'fatima@ceegb.gw',   '#c8922a', 3),
('Dr. Carlos Mendes',  'Consultor — Hidrocarbonetos',    'Geólogo com experiência em exploração petrolífera offshore na costa ocidental africana.',             'carlos@ceegb.gw',   '#16a34a', 4);

-- Indicadores de Mercado
INSERT INTO indicadores_mercado (nome, valor, unidade, descricao, icone, ordem) VALUES
('Petróleo Brent',         '78.4',  'USD/barril', 'Preço de referência internacional',           '🛢️', 1),
('Tarifa Elétrica Média',  '0.22',  'USD/kWh',    'Média regional CEDEAO',                       '⚡', 2),
('Irradiação Solar',       '5.8',   'kWh/m²/dia', 'Média anual na Guiné-Bissau',                 '☀️', 3),
('Quota Renovável',        '12',    '%',           'Participação no mix energético regional',     '🌿', 4);

-- Páginas CMS
INSERT INTO paginas (slug, titulo, conteudo, meta_desc) VALUES
('sobre',    'Sobre o CEEGB', 'Gabinete de consultoria especializado em energia desde 2012.', 'Conheça o CEEGB, gabinete de consultoria em energia na Guiné-Bissau.'),
('missao',   'Missão e Valores',    'Apoiar a transição para sistemas energéticos mais sustentáveis.', 'Missão e valores do CEEGB.');
