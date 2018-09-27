import { queryControllers } from '../services/dashboard';

export default {
  namespace: 'dashboard',

  state: {
    controller: '',
    result: '',
    results: [],
    configCategories: [],
    configData: [],
    iterations: [],
    controllers: [],
    loading: false,
  },

  effects: {
    *fetchControllers({ payload }, { call, put }) {
      let response = yield call(queryControllers, payload);

      let controllers = [];
      response.aggregations.controllers.buckets.map(controller => {
        controllers.push({
          key: controller.key,
          controller: controller.key,
          results: controller.doc_count,
          last_modified_value: controller.runs.value,
          last_modified_string: controller.runs.value_as_string,
        });
      });

      yield put({
        type: 'getControllers',
        payload: controllers,
      });
    }
  },

  reducers: {
    getControllers(state, { payload }) {
      return {
        ...state,
        controllers: payload,
      };
    },
  },
};
