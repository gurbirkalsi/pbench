import request from '../utils/request';

export async function queryDatastoreConfig() {
  return request('//' + window.location.host + '/' + process.env.CONFIG + '.config.json', {
    method: 'GET',
  });
}
