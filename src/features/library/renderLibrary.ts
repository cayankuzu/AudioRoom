import { getLibraryExperienceById } from "../../content/library";
import { createEmptyLibraryFilters } from "./catalog";
import { getLibraryRoute } from "./router";
import {
  renderLibraryHome,
  type FilterSectionKey,
  type LibraryHomeState,
} from "./renderLibraryHome";
import { renderLibraryDetail } from "./renderLibraryDetail";

export function renderLibrary(root: HTMLElement): () => void {
  const state: LibraryHomeState = {
    query: "",
    rotation: 0,
    selectedId: null,
    filters: createEmptyLibraryFilters(),
    filterPanelOpen: false,
    openFilterSection: null,
  };

  let cleanupView: (() => void) | null = null;

  const renderCurrentRoute = () => {
    cleanupView?.();

    const route = getLibraryRoute();
    if (route.kind === "album") {
      const experience = getLibraryExperienceById(route.albumId);
      if (experience) {
        cleanupView = renderLibraryDetail(root, experience);
        return;
      }
    }

    cleanupView = renderLibraryHome(root, state, {
      onQueryChange(query) {
        state.query = query;
        renderCurrentRoute();
      },
      onFiltersChange(filters) {
        state.filters = filters;
        renderCurrentRoute();
      },
      onFilterPanelToggle(open) {
        state.filterPanelOpen = open;
        renderCurrentRoute();
      },
      onFilterSectionToggle(section) {
        state.openFilterSection = section;
        renderCurrentRoute();
      },
    });
  };

  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();

  return () => {
    window.removeEventListener("hashchange", renderCurrentRoute);
    cleanupView?.();
  };
}
