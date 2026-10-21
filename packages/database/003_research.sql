CREATE TABLE research_sources (id text PRIMARY KEY, current_capture_id uuid);
CREATE TABLE research_captures (id uuid PRIMARY KEY, source_id text NOT NULL REFERENCES research_sources(id), capture_key text NOT NULL, content_hash text NOT NULL, raw text NOT NULL, observation jsonb NOT NULL, payload jsonb, errors jsonb NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_id,capture_key));
ALTER TABLE research_sources ADD FOREIGN KEY(current_capture_id) REFERENCES research_captures(id);
CREATE TABLE research_proposals (id uuid PRIMARY KEY, source_id text NOT NULL REFERENCES research_sources(id), capture_id uuid NOT NULL REFERENCES research_captures(id), baseline_id uuid REFERENCES research_captures(id), identity text NOT NULL UNIQUE, changes jsonb NOT NULL, status text NOT NULL CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE research_results (capture_id uuid PRIMARY KEY REFERENCES research_captures(id), proposal_id uuid REFERENCES research_proposals(id));
CREATE TABLE research_decisions (id uuid PRIMARY KEY, proposal_id uuid NOT NULL UNIQUE REFERENCES research_proposals(id), decision text NOT NULL CHECK(decision IN ('approved','rejected')), actor text NOT NULL, rationale text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER immutable_research_captures BEFORE UPDATE OR DELETE ON research_captures FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER immutable_research_results BEFORE UPDATE OR DELETE ON research_results FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
CREATE TRIGGER immutable_research_decisions BEFORE UPDATE OR DELETE ON research_decisions FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
