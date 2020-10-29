import Core from '../../core';

const { BaseSerializer: Base } = Core.serializers;

const Config = Core.config;
const PLATFORM_URL = Config.get('platformURL');

export class BaseSerializer extends Base {
  static get platformURL() {
    return PLATFORM_URL;
  }

  static userRel() {
    return {
      ref: 'id',
      attributes: ['uuid', 'email', 'first_name', 'last_name'],
    };
  }
}

export default BaseSerializer;
