const resolve = (payload) => Promise.resolve(payload);

export const apiClient = {
  get: async (payload) => resolve(payload),
  post: async (_endpoint, payload, _options = {}) => resolve(payload),
};

export default apiClient;
