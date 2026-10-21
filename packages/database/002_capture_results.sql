CREATE TABLE capture_results (snapshot_id uuid PRIMARY KEY REFERENCES snapshots(id), proposal_id uuid REFERENCES proposals(id));
INSERT INTO capture_results SELECT s.id, p.id FROM snapshots s LEFT JOIN proposals p ON p.snapshot_id=s.id;
CREATE TRIGGER immutable_capture_results BEFORE UPDATE OR DELETE ON capture_results FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
