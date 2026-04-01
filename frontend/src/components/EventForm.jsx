import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';

const DEFAULT_VALUES = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  ageRating: 0,
  coverUrl: '',
  status: 'DRAFT',
  categoryIds: []
};

const EventForm = ({
  initialValues,
  categories = [],
  isSubmitting = false,
  submitLabel = 'Сохранить',
  errorMessage = '',
  onSubmit
}) => {
  const mergedInitialValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
      categoryIds: Array.isArray(initialValues?.categoryIds) ? initialValues.categoryIds : []
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(mergedInitialValues);

  useEffect(() => {
    setFormData(mergedInitialValues);
  }, [mergedInitialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (categoryId) => {
    setFormData((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists ? prev.categoryIds.filter((id) => id !== categoryId) : [...prev.categoryIds, categoryId]
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      fullDescription: formData.fullDescription.trim(),
      ageRating: Number(formData.ageRating),
      coverUrl: formData.coverUrl.trim(),
      status: formData.status,
      categoryIds: formData.categoryIds
    });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Название
        <input name="title" value={formData.title} onChange={handleChange} required />
      </label>

      <label>
        Краткое описание
        <input name="shortDescription" value={formData.shortDescription} onChange={handleChange} required />
      </label>

      <label>
        Полное описание
        <textarea name="fullDescription" value={formData.fullDescription} onChange={handleChange} rows={5} />
      </label>

      <label>
        Возрастное ограничение
        <input
          type="number"
          name="ageRating"
          min="0"
          max="21"
          value={formData.ageRating}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Обложка (URL)
        <input name="coverUrl" value={formData.coverUrl} onChange={handleChange} placeholder="https://..." />
      </label>

      <label>
        Статус
        <select name="status" value={formData.status} onChange={handleChange} required>
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликовано</option>
          <option value="ARCHIVED">В архиве</option>
        </select>
      </label>

      <div>
        <p className="form-section-title">Категории</p>
        <div className="checkbox-grid">
          {categories.map((category) => (
            <label key={category.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Сохраняем...' : submitLabel}
      </button>
    </form>
  );
};

export default EventForm;

