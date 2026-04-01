import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';

const CategoryForm = ({ initialValues, isSubmitting = false, errorMessage = '', submitLabel, onCancel, onSubmit }) => {
  const normalizedInitial = useMemo(
    () => ({
      name: initialValues?.name || '',
      description: initialValues?.description || ''
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(normalizedInitial);

  useEffect(() => {
    setFormData(normalizedInitial);
  }, [normalizedInitial]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || null
    });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Название категории
        <input
          name="name"
          value={formData.name}
          onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </label>

      <label>
        Описание
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
        />
      </label>

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <div className="inline-actions">
        {onCancel && (
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </button>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;

