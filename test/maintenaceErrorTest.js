const helper = require('./testHelper')
const Boss = require('../')

describe('maintenance error handling', function () {
  this.timeout(10000)

  beforeEach(async function () { await helper.init() })

  it('maintenance error handling works', async function () {
    const config = {
      monitorStateIntervalMinutes: 1,
      maintenanceIntervalSeconds: 1,
      __test_throw_on_maint__: true
    }

    const boss = new Boss(helper.getConfig(config))
    await boss.start()
    return new Promise(resolve => { boss.on('error', resolve) })
  })

  it('state monitoring error handling works', async function () {
    const config = {
      monitorStateIntervalSeconds: 1,
      maintenanceIntervalMinutes: 1,
      __test_throw_on_monitor__: true
    }

    const boss = new Boss(helper.getConfig(config))
    await boss.start()
    return new Promise(resolve => { boss.on('error', resolve) })
  })
})
