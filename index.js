'use strict'

// load electron modules
const { app, BrowserWindow } = require('electron')
const jsdom = require('jsdom')
const request = require('request')

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// function to create a new window from a url and return the window to the caller
const createWindow = url => {
  let win

  // create the browser window, set width/height to whatever you want \^_^/
  win = new BrowserWindow({ width: 800, height: 600 })

  // load a remote url, in this case the LinkedIn profile for my current employer, Net Natives
  // win.loadURL('https://www.linkedin.com/company/net-natives/') // old style page
  // win.loadURL('https://www.linkedin.com/company-beta/305751/') // new style page
  win.loadURL(url)

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  return Promise.resolve(win)
}

const getFollowers = win => {
  // on browser load finish
  win.webContents.on('did-finish-load', () => {
    // execute js to get pathname
    win.webContents.executeJavaScript('location.pathname', pathname => {
      console.log(`Pathname: ${pathname}`)

      // holder for query selector
      let querySelector = ''

      // check pathname
      if (pathname.indexOf('/school/') !== -1 || pathname.indexOf('/company-beta/') !== -1) {
        // new style page
        querySelector = '.org-top-card-module__followers-count'
      } else if (pathname.indexOf('/biz/') !== -1 || pathname.indexOf('/company/') !== -1) {
        // old style page
        querySelector = '.followers-count'
      }

      // use query selector to get followers
      if (querySelector) {
        setTimeout(() => {
          win.webContents.executeJavaScript(`document.querySelector('${querySelector}').innerText`, text => {
            let followers = parseInt(text.match(/\d/g).join(''))
            console.log(`Followers: ${followers}`)
            // do what you want with followers here
            return Promise.resolve({win, pathname})
          })
        }, 2000)
      }
    })
  })
}

const getCompanyId = (win, pathname) => {
  // attempt to get company id from pathname
  let companyId = parseInt(pathname.match(/\d/g) ? pathname.match(/\d/g).join('') : NaN)
  console.log(`get company id: ${companyId}`)

  // no company id, so get it from webpage
  if (!companyId) {
    setTimeout(() => {
      win.webContents.executeJavaScript('parseInt(document.body.innerHTML.match(/companyId=\\d+/g)[0].match(/\\d+/g)[0])', id => {
        console.log(`company id: ${id}`)
        if (id) {
          return Promise.resolve(win, id)
        } else {
          return Promise.reject(new Error('No Company Id Found.'))
        }
      })
    }, 2000)
  } else {
    return Promise.resolve(win, companyId)
  }
}

// const getCompanyUpdates = (id, index = 0) => {
//   win.loadURL('https://www.linkedin.com/biz/305751/single-update?activityUrn=urn%3Ali%3Aactivity%3A6243048981178523648')
//   // on browser load finish
//   win.webContents.on('did-finish-load', () => {
//     // execute js to get pathname
//     win.webContents.executeJavaScript('document.body.innerText', result => {
//       console.log(result)
//     })
//   })
//   let url = `https://www.linkedin.com/biz/${id}/feed?start=${index}`
//   jsdom.env(url, (err, window) => {
//     if (err) { throw err }
//     let feedItems = window.document.getElementsByClassName('feed-item')
//     win.webContents.executeJavaScript('parseInt(document.body.innerHTML.match(/companyId=\\d+/g)[0].match(/\\d+/g)[0])', id => {
//       console.log(`company id: ${id}`)
//       companyId = id
//       return getCompanyUpdates(win, companyId)
//     })
//   })
// }

const startScrape = (url) => {
  return Promise.resolve(url)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  let url = 'https://www.linkedin.com/company/net-natives/'

  startScrape(url)
    // .then(createWindow)
    // .then(getFollowerAndCompanyId)
    .then((result) => {

    })
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
