import { setupRenderingTest } from '@glimmer/test-helpers';
import hbs from '@glimmer/inline-precompile';

const { module, test } = QUnit;

module('Component: jsonapi-swagger-ui', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await this.render(hbs`<jsonapi-swagger-ui />`);
    assert.equal(this.containerElement.textContent, 'Welcome to Glimmer!\n');
  });
});
