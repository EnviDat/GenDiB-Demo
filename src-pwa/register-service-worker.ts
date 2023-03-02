import { register } from 'register-service-worker'
import { Notify } from 'quasar'

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(/* registration */) {
    console.log('Service worker is active.')
  },

  registered(/* registration */) {
    console.log('Service worker has been registered.')
  },

  cached(/* registration */) {
    console.log('Content has been cached for offline use.')
  },

  updatefound(/* registration */) {
    console.log('App update found.')
    Notify.create({
      color: 'info',
      position: 'top',
      message: 'Update found. Downloading...',
      icon: 'update',
    })
  },

  updated(/* registration */) {
    console.log('App update complete.')
    Notify.create({
      color: 'positive',
      position: 'top',
      message: 'Update installed. Please refresh.',
      actions: [
        {
          icon: 'refresh',
          'aria-label': 'Refresh',
          color: 'secondary',
          handler: () => {
            location.reload()
          },
        },
      ],
    })
  },

  offline() {
    console.log('App is running in offline mode.')
    Notify.create({
      color: 'warning',
      position: 'top',
      message: 'No internet connection found. App is running in offline mode.',
      icon: 'wifi_off',
    })
  },

  error(err) {
    console.error(`Error during service worker registration: ${err}`)
    Notify.create({
      color: 'warning',
      position: 'top',
      message: 'Error during app initialisation.',
      icon: 'report_problem',
    })
  },
})
