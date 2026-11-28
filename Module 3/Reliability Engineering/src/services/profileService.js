
const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check whether an error can be retried
function isRetryable(error) {
  if (error.name === 'AbortError') {
    return true;
  }

  // Network errors have no HTTP status
  if (error.status === undefined || error.status === null) {
    return true;
  }

  // Retry 429 and 5xx errors only
  return error.status === 429 || error.status >= 500;
}

// Stop an operation if it takes too long
async function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// Retry failed operations with exponential backoff
async function withRetry(operation, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 25,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === maxAttempts - 1 ||
        !isRetryable(error)
      ) {
        throw error;
      }

      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
}

// Get profile with a reliable avatar
async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs || 200;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  try {
    const avatar = await withRetry(
      () =>
        withTimeout(
          signal => avatarClient.getAvatar(authorId, { signal }),
          timeoutMs
        ),
      {
        maxAttempts,
        baseDelayMs,
      }
    );

    return {
      authorId,
      avatar,
      degraded: false,
    };
  } catch (error) {
    return {
      authorId,
      avatar: DEFAULT_AVATAR,
      degraded: true,
    };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};
