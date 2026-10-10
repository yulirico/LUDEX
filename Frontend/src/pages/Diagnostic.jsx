import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Diagnostic() {
  const [questions, setQuestions] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.diagnosticStatus().then(s => {
      if (s.taken) { navigate('/'); return; }
      api.diagnosticQuestions().then(r => setQuestions(r.questions));
    });
  }, [navigate]);

  if (!questions) return <div className="loading">Cargando diagnóstico…</div>;

  const q = questions[index];
  const progressPct = Math.round(((index) / questions.length) * 100);

  function select(optIdx) {
    setAnswers(a => ({ ...a, [q.id]: optIdx }));
  }

  async function next() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      setSubmitting(true);
      const payload = questions.map(qq => ({ id: qq.id, selected: answers[qq.id] ?? -1 }));
      await api.diagnosticSubmit(payload);
      navigate('/');
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="bar" style={{ flex: 1 }}><i style={{ width: `${progressPct}%` }} /></div>
        <small style={{ color: 'var(--muted)' }}>Pregunta {index + 1} de {questions.length}</small>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <span className="tag">{q.topic}</span>
        <h3 style={{ marginTop: 10 }}>{q.prompt}</h3>
        <div className="opts">
          {q.options.map((opt, i) => (
            <button key={i} className={'opt' + (answers[q.id] === i ? ' selected' : '')} onClick={() => select(i)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="btns">
        <button className="btn primary" disabled={answers[q.id] === undefined || submitting} onClick={next}>
          {index < questions.length - 1 ? 'Siguiente' : (submitting ? 'Enviando…' : 'Finalizar diagnóstico')}
        </button>
      </div>
    </div>
  );
}