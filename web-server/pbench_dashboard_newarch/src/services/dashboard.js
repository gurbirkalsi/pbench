import request from '../utils/request';
import moment from 'moment';

export async function queryControllers(params) {
  let startMonth = params[0];
  let endMonth = params[1];

  let months = '';
  if (!startMonth.isBefore(endMonth)) {
    months = months.concat('dsa.pbench.run.' + startMonth.format('YYYY-MM') + ',');
  }
  while (startMonth.isBefore(endMonth) && startMonth.isBefore(moment().endOf('month'))) {
    months = months.concat('dsa.pbench.run.' + startMonth.format('YYYY-MM') + ',');
    startMonth.add(1, 'month');
  }

  const endpoint = 'http://elasticsearch.perf.lab.eng.bos.redhat.com:9280/' + months + '/_search';

  return request(endpoint, {
    method: 'POST',
    body: {
      aggs: {
        controllers: {
          terms: {
            field: 'controller',
            size: 0,
            order: {
              runs: 'desc',
            },
          },
          aggs: {
            runs: {
              min: {
                field: 'run.start_run',
              },
            },
          },
        },
      },
    },
  });
}
