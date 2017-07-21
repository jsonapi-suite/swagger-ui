import Component, { tracked } from '@glimmer/component';

export default class NavHeader extends Component {
  githubURL: string;

  constructor(attributes) {
    super(attributes);
    this.githubURL = window['CONFIG'].githubURL;
  }

  @tracked('args')
  get title() {
    return this.args.swagger.info.title;
  }
};
