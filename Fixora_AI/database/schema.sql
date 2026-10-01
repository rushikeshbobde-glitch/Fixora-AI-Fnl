CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    department VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(80) NOT NULL,
    content TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    issue TEXT NOT NULL,
    category VARCHAR(80),
    priority VARCHAR(30),
    status VARCHAR(40) DEFAULT 'NEW',
    diagnosis TEXT,
    resolution TEXT,
    escalation_reason TEXT,
    confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    agent_name VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL,
    output JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    source_code VARCHAR(80) NOT NULL,
    title VARCHAR(250) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_actions (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    tool_name VARCHAR(120) NOT NULL,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    output JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
