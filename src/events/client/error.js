import { logger } from '../../utils/helpers.js';

export default function error(client, error) {
  logger.error('Client error:', error?.message || error);
}
