import Component, { tracked } from '@glimmer/component';
let $ = window['$'];

export default class EndpointRoute extends Component {
  @tracked fetchParams = {};
  @tracked selectedPayloadName: string;
  @tracked idParam: string;

  constructor(attributes) {
    super(attributes);
    this.args.context.endpointComponent = this;
  }

  updateParams(name, e) {
    this.fetchParams[name] = e.target.value;
  }

  updateIdParam(e) {
    this.idParam = e.target.value;
  }

  changeCurrentPayload(e) {
    this.selectedPayloadName = e.target.value;
  }

  @tracked('selectedPayloadName')
  get currentPayload() {
    if (this.selectedPayloadName) {
      return this.payloads.find((p) => {
        return p.name === this.selectedPayloadName;
      });
    } else {
      return this.payloads[0];
    }
  }

  switchTab(tabId, e) {
    e.preventDefault();
    $('.nav-tabs li a').removeClass('active');
    $('.tab-pane').removeClass('active');
    $(e.target).addClass('active');
    $(`#${tabId}`).addClass('active');
  }

  presentFetchParams() {
    let newParams = {};
    Object.keys(this.fetchParams).forEach((key) => {
      if (this.fetchParams[key]) {
        newParams[key] = this.fetchParams[key];
      }
    });
    return newParams;
  }

  pathParams() {
    if (this.idParam && this.idParam != '') {
      return `/${this.idParam}`;
    } else {
      return '';
    }
  }

  @tracked('args')
  get isReadOperation() {
    return this.args.params.id.indexOf('-get') > -1;
  }

  @tracked('args')
  get isCreateAction() {
    return this.args.params.id.indexOf('-post') > -1;
  }

  @tracked('args')
  get isUpdateAction() {
    return this.args.params.id.indexOf('-put') > -1;
  }

  @tracked('args')
  get fetchMethod() {
    if (this.isReadOperation) {
      return 'GET';
    } else if(this.isCreateAction) {
      return 'POST';
    } else if(this.isUpdateAction) {
      return 'PUT';
    } else {
      return 'DELETE';
    }
  }

  fetch() {
    let url = window['CONFIG']['basePath'];
    url += this.model.path.split('/{')[0];
    url += this.pathParams();

    if (this.isReadOperation) {
      this.doRead(url).then((responseJSON) => {
        this.onApiResponse(responseJSON);
      });
    } else {
      this.doWrite(url).then((responseJSON) => {
        this.onApiResponse(responseJSON);
      });
    }
  }

  onApiResponse(responseJSON) {
    let html = window['$'](`<pre class="highlight"><code class="json hljs">${responseJSON}</code></pre>`);
    window['$']('#api-response').html(html);

    window['$']('pre.highlight code').each(function(i, block) {
      window['hljs'].highlightBlock(block);
    });
  }

  doRead(url) {
    let paramString = window['$'].param(this.presentFetchParams());
    url = `${url}?${paramString}`
    return fetch(url).then((response) => {
      return response.json().then((json) => {
        return JSON.stringify(json, null, 2);
      });
    });
  }

  doWrite(url) {
    let opts = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (this.fetchParams['payload']) {
      let json = JSON.parse(this.fetchParams['payload']);
      json = JSON.stringify(json);
      opts['body'] = json;
    }

    opts['method'] = this.fetchMethod;
    return fetch(url, opts).then((response) => {
      return response.json().then((json) => {
        return JSON.stringify(json, null, 2);
      });
    });
  }

  @tracked('model')
  get payloads() {
    let arr = [];
    this.model.config.tags.forEach((t) => {
      if (t.startsWith('payload')) {
        let payloadName = t.split('payload-')[1];
        let payload = this.args.swagger.definitions[payloadName];
        payload = { name: payloadName, ...payload };
        arr.push(payload);
      }
    });
    return arr;
  }

  @tracked('args')
  get model() {
    return this.args.swagger.endpoints.find((e) => {
      return e.id === this.args.params.id;
    });
  }
};
