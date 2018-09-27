import moment from 'moment';

const defaultMonth = moment(new Date(), 'YYYY-MM');

export default {
  namespace: 'global',

  state: {
    collapsed: false,
    startMonth: defaultMonth,
    endMonth: defaultMonth
  },

  effects: {
    *updateControllerStartMonth({ payload }, { select, put }) {
      yield put({
        type: 'modifyControllerStartMonth',
        payload: payload,
      });
    },
    *updateControllerEndMonth({ payload }, { select, put }) {
      yield put({
        type: 'modifyControllerEndMonth',
        payload: payload,
      });
    },
  },

  reducers: {
    changeLayoutCollapsed(state, { payload }) {
      return {
        ...state,
        collapsed: payload,
      };
    },
    modifyControllerStartMonth(state, { payload }) {
      return { 
        ...state,
        startMonth: payload
      }
    },
    modifyControllerEndMonth(state, { payload }) {
      return {
        ...state,
        endMonth: payload
      }
    }
  },

  subscriptions: {
    setup({ history }) {
      // Subscribe history(url) change, trigger `load` action if pathname is `/`
      return history.listen(({ pathname, search }) => {
        if (typeof window.ga !== 'undefined') {
          window.ga('send', 'pageview', pathname + search);
        }
      });
    },
  },
};
