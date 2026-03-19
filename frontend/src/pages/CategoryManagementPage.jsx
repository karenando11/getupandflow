import { useEffect, useState } from "react";

import { apiClient } from "../api/client";
import { getErrorMessage, getListData, getPaginationMeta } from "../api/utils";
import { PRESET_CATEGORY_COLORS, getCategoryColorHex } from "../categories/presetColors";
import { PaginationControls } from "../components/PaginationControls";

function getInitialState(category) {
  return {
    name: category?.name || "",
    color: category?.color || PRESET_CATEGORY_COLORS[0].value,
  };
}

export function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formState, setFormState] = useState(getInitialState(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [listErrorMessage, setListErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  async function loadCategories(page = currentPage) {
    setIsLoadingCategories(true);
    setListErrorMessage("");
    try {
      const response = await apiClient.get("/categories/", { params: { page } });
      setCategories(getListData(response.data));
      setTotalPages(getPaginationMeta(response.data).totalPages);
      setCurrentPage(page);
    } catch (error) {
      setCategories([]);
      setTotalPages(0);
      setListErrorMessage(getErrorMessage(error, "We couldn't load categories right now."));
    } finally {
      setIsLoadingCategories(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await apiClient.patch(`/categories/${editingCategory.id}/`, formState);
      } else {
        await apiClient.post("/categories/", formState);
      }
      setEditingCategory(null);
      setFormState(getInitialState(null));
      await loadCategories(1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to save category."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(categoryId) {
    setListErrorMessage("");
    try {
      await apiClient.delete(`/categories/${categoryId}/`);
      if (editingCategory?.id === categoryId) {
        setEditingCategory(null);
        setFormState(getInitialState(null));
      }
      await loadCategories(1);
    } catch (error) {
      setListErrorMessage(getErrorMessage(error, "Unable to delete category."));
    }
  }

  return (
    <main className="content-page">
      <section className="content-card">
        <p className="eyebrow">Event Categories</p>
        <h2>Manage your event categories</h2>
        <p className="subtle-copy">Categories are only used for events and must use one of the preset colors.</p>

        <form className="entity-form-grid category-form" onSubmit={handleSubmit}>
          <label>
            Category name
            <input
              required
              value={formState.name}
              onChange={(e) => setFormState((current) => ({ ...current, name: e.target.value }))}
            />
          </label>

          <div className="entity-form-wide">
            <p className="menu-section-title">Preset Colors</p>
            <div className="color-picker-grid">
              {PRESET_CATEGORY_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={formState.color === color.value ? "color-choice active" : "color-choice"}
                  onClick={() => setFormState((current) => ({ ...current, color: color.value }))}
                  style={{ "--category-color": color.hex }}
                  type="button"
                >
                  <span className="color-choice-swatch" />
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage ? <p className="form-error entity-form-wide">{errorMessage}</p> : null}
          <div className="entity-form-actions entity-form-wide">
            <button className="task-create-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingCategory ? "Save category" : "Create category"}
            </button>
            {editingCategory ? (
              <button
                aria-label="Close category form"
                className="entity-form-dismiss"
                onClick={() => {
                  setEditingCategory(null);
                  setFormState(getInitialState(null));
                }}
                type="button"
              >
                X
              </button>
            ) : null}
          </div>
        </form>

        {listErrorMessage ? <p className="form-error">{listErrorMessage}</p> : null}
        {isLoadingCategories ? <p className="subtle-copy">Loading categories...</p> : null}
        <div className="category-list">
          {categories.map((category) => (
            <article key={category.id} className="category-item">
              <div className="category-item-main">
                <span className="category-swatch" style={{ background: getCategoryColorHex(category.color) }} />
                <div>
                  <strong>{category.name}</strong>
                  <p className="subtle-copy">{category.color}</p>
                </div>
              </div>
              <div className="category-item-actions">
                <button
                  className="calendar-nav-button"
                  onClick={() => {
                    setEditingCategory(category);
                    setFormState(getInitialState(category));
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button className="entity-form-close" onClick={() => handleDelete(category.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        <PaginationControls
          currentPage={currentPage}
          isLoading={isLoadingCategories}
          label="categories"
          onPageChange={loadCategories}
          totalPages={totalPages}
        />
      </section>
    </main>
  );
}
