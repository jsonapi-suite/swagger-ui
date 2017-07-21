import Component, { tracked } from '@glimmer/component';
import { onChange } from '../../../utils/router';
import config from '../../../../config/environment';
console.log('configwas', config)

let $ = window['$'];

export default class JsonapiSwaggerUi extends Component {
  @tracked protected currentRouteComponent: string;
  @tracked params = {};
  @tracked swagger = {};
  @tracked id = 'employee';
  @tracked routeIsChanging = false;
  endpointComponent: any;

  @tracked('swagger')
  get isReady() {
    return !!this.swagger['info'];
  }

  constructor(options) {
    super(options);

    let url = `${window['CONFIG'].basePath}/swagger.json`;
    fetch(url).then((response) => {
      response.json().then((json) => {
        this.swagger = this._buildSwagger(json);
      });
    });

    onChange((componentName: string, params: any) => {
      this.params = params;
      this.currentRouteComponent = componentName;

      this.routeIsChanging = true;
      let doRouteChange = () => { this.routeIsChanging = false; }
      setTimeout(doRouteChange, 1);
    });
  }

  _buildSwagger(json) {
    json.models = [];
    json.endpoints = [];

    Object.keys(json.paths).forEach((pathName) => {
      let pathConfig = json.paths[pathName];

      Object.keys(pathConfig).forEach((methodName) => {
        let methodConfig = pathConfig[methodName];

        let id = `${pathName.replace(/\//g, '-')}-${methodName}`;

        json.endpoints.push({
          id: id,
          path: pathName,
          label: `${pathName}#${methodName}`,
          config: methodConfig
        });
      });
    });

    Object.keys(json.definitions).forEach((defName) => {
      let config = json.definitions[defName];
      json.models.push({
        id: defName,
        label: defName,
        properties: config.properties
      });
    });

    window['swagger'] = json;

    return json;
  }
}
