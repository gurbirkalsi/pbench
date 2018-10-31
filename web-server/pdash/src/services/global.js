import request from '../utils/request';

export async function queryDatastoreConfig() {
  return request('http://localhost:8001/' + process.env.CONFIG + '.config.json', {
    method: 'GET',
  });
}
