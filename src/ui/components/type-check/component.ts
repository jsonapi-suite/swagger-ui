import Component, { tracked } from '@glimmer/component';

export default class TypeCheck extends Component {
  mapping = {
    string: 'label-success',
    integer: 'label-primary',
    float: 'label-info',
    boolean: 'label-danger'
  }

  @tracked('args')
  get labelClass() {
    return this.mapping[this.args.type];
  }
};
