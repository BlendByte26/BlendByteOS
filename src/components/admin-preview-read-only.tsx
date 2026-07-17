"use client";

import { useEffect } from "react";

const MESSAGE = "Indisponível em modo de pré-visualização.";

export function AdminPreviewReadOnly() {
  useEffect(() => {
    const disableMutationControls = () => {
      document
        .querySelectorAll<HTMLButtonElement>(
          '.admin-preview form[method="post"]:not([data-preview-allowed]) button[type="submit"], .admin-preview form[method="post"]:not([data-preview-allowed]) button:not([type])',
        )
        .forEach((button) => {
          const form = button.closest("form");
          const isPreviewControl = form?.querySelector('input[name="profile"], input[name="returnPath"]');
          if (isPreviewControl) return;
          button.disabled = true;
          button.title = MESSAGE;
        });
    };

    disableMutationControls();
    const observer = new MutationObserver(disableMutationControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
