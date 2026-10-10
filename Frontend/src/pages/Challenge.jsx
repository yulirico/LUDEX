import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function Challenge() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setChallenges(null);
    setIndex(0);
    setSelected(null);
    setFeedback(null);
    setError('');
    api.levelChallenges(levelId)
      .then(response => setChallenges(response.challenges))
      .catch(err => setError(err.message));
  }, [levelId]);

  if (error) return <div className="page"><div className="error-box">{error}</div></div>;
  if (!challenges) return <div className="loading">Cargando retos…</div>;
  if (challenges.length === 0) {
    return <div className="page"><div className="error-box">Este nivel todavía no tiene retos.</div></div>;
  }

  const challenge = challenges[index];

  async function submitAnswer() {
    setSubmitting(true);
    setError('');
    try {
      const result = await api.attemptChallenge(challenge.id, selected);
      setFeedback(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function continueAfterAnswer() {
    if (index < challenges.length - 1) {
      setIndex(current => current + 1);
      setSelected(null);
      setFeedback(null);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.advanceStage(levelId);
      navigate(`/nivel/${levelId}/resultados`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="crumb">Reto › {challenge.topic} › <b>{index + 1} de {challenges.length}</b></div>
      <div className="page">
        <div className="bar" style={{ marginBottom: 18 }}>
          <i style={{ width: `${Math.round((index / challenges.length) * 100)}%` }} />
        </div>
        <div className="card">
          <span className="tag">{challenge.topic}</span>
          <h3 style={{ marginTop: 10 }}>{challenge.prompt}</h3>
          <div className="opts">
            {challenge.options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                className={`opt${selected === optionIndex ? ' selected' : ''}${feedback && optionIndex === feedback.correct_index ? ' correct' : ''}${feedback && selected === optionIndex && !feedback.correct ? ' wrong' : ''}`}
                disabled={Boolean(feedback) || submitting}
                onClick={() => setSelected(optionIndex)}
              >
                {option}
              </button>
            ))}
          </div>
          {challenge.hint && !feedback && <div className="hint-box">Pista: {challenge.hint}</div>}
          {feedback && (
            <div className={feedback.correct ? 'card' : 'error-box'} style={feedback.correct ? { borderColor: 'var(--teal)' } : undefined}>
              {feedback.correct ? '¡Correcto! ' : 'Respuesta incorrecta. '}
              {feedback.explanation}
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
        </div>
        <div className="btns">
          <Link className="btn ghost" to="/">Volver al mapa</Link>
          {!feedback ? (
            <button className="btn primary" disabled={selected === null || submitting} onClick={submitAnswer}>
              {submitting ? 'Revisando…' : 'Comprobar respuesta'}
            </button>
          ) : (
            <button className="btn primary" disabled={submitting} onClick={continueAfterAnswer}>
              {index < challenges.length - 1 ? 'Siguiente reto' : submitting ? 'Guardando…' : 'Ver resultados'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}