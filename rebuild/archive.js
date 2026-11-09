const SCRIPT_MARKER = '<!-- APP_SCRIPT -->';

export function createArchive(shell, scriptText) {
  const available =
    typeof shell === 'string' &&
    typeof scriptText === 'string' &&
    scriptText.trim().length > 0 &&
    shell.indexOf(SCRIPT_MARKER) !== -1 &&
    shell.indexOf(SCRIPT_MARKER) === shell.lastIndexOf(SCRIPT_MARKER);
  let objectUrl = null;

  return {
    available,
    save(anchor) {
      if (!available || !anchor || (typeof anchor !== 'object' && typeof anchor !== 'function')) {
        return false;
      }

      try {
        if (!objectUrl) {
          if (typeof Blob !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
            return false;
          }

          // Keep the pristine page and original source; the running DOM is never serialized.
          const safeScript = scriptText.replace(/<\/script/gi, token => '<\\/' + token.slice(2));
          const html = shell.replace(
            SCRIPT_MARKER,
            () => '<script data-badger-app>' + safeScript + '</script>'
          );
          const nextUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
          if (typeof nextUrl !== 'string' || !nextUrl) return false;
          objectUrl = nextUrl;
        }

        anchor.href = objectUrl;
        anchor.download = 'BADGER-19.html';
        return true;
      } catch {
        return false;
      }
    }
  };
}
