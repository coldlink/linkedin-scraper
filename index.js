'use strict'

// load electron modules
const {app, BrowserWindow} = require('electron')

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// function to create a new window
const createWindow = () => {
  // create the browser window, set width/height to whatever you want \^_^/
  win = new BrowserWindow({width: 800, height: 600})

  // load a remote url, in this case the LinkedIn profile for my current employer, Net Natives
  win.loadURL('https://www.linkedin.com/company/net-natives/') // old style page
  // win.loadURL('https://www.linkedin.com/company-beta/305751/') // new style page

   // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript('location.pathname', pathname => {
      console.log(`pathname: ${pathname}`)

      let querySelector = ''

      if (pathname.indexOf('/school/') !== -1 || pathname.indexOf('/company-beta/') !== -1) {
        querySelector = '.org-top-card-module__followers-count'
      } else if (pathname.indexOf('/biz/') !== -1 || pathname.indexOf('/company/') !== -1) {
        querySelector = '.followers-count'
      }

      let companyId = parseInt(pathname.match(/\d/g) ? pathname.match(/\d/g).join('') : NaN)
      console.log(`get company id: ${companyId}`)

      if (querySelector) {
        setTimeout(() => {
          win.webContents.executeJavaScript(`document.querySelector('${querySelector}').innerText`, text => {
            let followers = parseInt(text.match(/\d/g).join(''))
            console.log(followers)
            // do what you want with followers
          })
        }, 2000)
      }

      if (!companyId) {
        setTimeout(() => {
          win.webContents.executeJavaScript(`parseInt(document.body.innerHTML.match(/companyId=\\d+/g)[0].match(/\\d+/g)[0])`, id => {
            console.log(`company id: ${id}`)
            companyId = id
          })
        }, 2000)
      }
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
