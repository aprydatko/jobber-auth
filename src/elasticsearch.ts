import { Client } from '@elastic/elasticsearch';
import { config } from '@auth/config';
import { ISellerGig, winstonLogger } from '@aprydatko/jobber-shared';
import { Logger } from 'winston';
import { ClusterHealthHealthResponseBody, GetResponse } from '@elastic/elasticsearch/lib/api/types';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'authElasticSearchServer', 'debug');

const elasticSearchClient = new Client({
  node: `${config.ELASTIC_SEARCH_URL}`
});

async function checkConnection(): Promise<void>{
  let isConnected = false;
  while(!isConnected) {
    log.info('AuthService connecting to ElasticSearch...');
    try {
      const health: ClusterHealthHealthResponseBody = await elasticSearchClient.cluster.health({});
      log.info(`AuthService Elasticsearch health status — ${health.status}`);
      isConnected = true;
    } catch(error) {
      log.error('Connection to Elasticsearch failed. Retrying...');
      log.log('error', 'AuthService checkConnection() method:', error);
    }
  }
}

async function checkIfIndexExists(indexName: string): Promise<boolean> {
  const result: boolean = await elasticSearchClient.indices.exists({ index: indexName });
  return result;
}

async function createIndex(indexName: string): Promise<void> {
  try {
    const result: boolean = await checkIfIndexExists(indexName);
    if (result) {
      log.info(`Index ${indexName} already exist.`);
    } else {
      await elasticSearchClient.indices.create({ index: indexName });
      await elasticSearchClient.indices.refresh({ index: indexName });
      log.info(`Created index ${indexName}`);
    }
  } catch (error) {
    log.error(`An error occured while creating index ${indexName}`);
    log.log('error', 'AuthService createIndex() method:', error);
  }
}

async function getDocumentById(index: string, gigId: string): Promise<ISellerGig> {
  try {
    const result: GetResponse = await elasticSearchClient.get({
      index,
      id: gigId
    });
    return result._source as ISellerGig;
  } catch (error) {
    log.log('error', 'AuthService elasticsearch getDocumentById() method:', error);
    return {} as ISellerGig;
  }
}

export { elasticSearchClient, checkConnection, createIndex, getDocumentById };