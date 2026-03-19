import { apiClient } from "./client";

function flattenErrors(value) {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrors);
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenErrors);
  }
  return [];
}

export function getErrorMessage(error, fallbackMessage = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  const flattened = flattenErrors(data);
  if (flattened.length > 0) {
    return flattened.join(" ");
  }
  return fallbackMessage;
}

export function getListData(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

export function getPaginationMeta(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      totalPages: data.length > 0 ? 1 : 0,
    };
  }

  const count = Number(data?.count || 0);
  const next = data?.next || null;
  const previous = data?.previous || null;
  const pageSize = Number(data?.page_size || 10);
  const totalPages = Number(data?.total_pages || (count > 0 ? Math.max(1, Math.ceil(count / pageSize)) : 0));

  return {
    count,
    next,
    previous,
    totalPages,
  };
}

export async function fetchAllPages(path, options = {}) {
  const params = { ...(options.params || {}), page_size: 100 };
  let page = 1;
  let results = [];

  while (true) {
    const response = await apiClient.get(path, {
      ...options,
      params: {
        ...params,
        page,
      },
    });
    const pageResults = getListData(response.data);
    results = [...results, ...pageResults];

    if (!response.data?.next) {
      return results;
    }

    page += 1;
  }
}
