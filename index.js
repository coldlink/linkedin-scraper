'use strict'

// get url from parameter
const url = process.argv[2] || 'OR HARDCODE URL HERE'

// load electron modules
const { app, BrowserWindow } = require('electron')
const jsdom = require('jsdom')
const request = require('request')
const _ = require('lodash')
const async = require('async')

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

const startScrape = (url) => {
  return Promise.resolve({url, result: {}})
}

// function to create a new window from a url and return the window to the caller
const createWindow = obj => new Promise((resolve, reject) => {
  let win

  // create the browser window, set width/height to whatever you want \^_^/
  win = new BrowserWindow({ width: 800, height: 600 })

  // load a remote url, in this case the LinkedIn profile for my current employer, Net Natives
  // win.loadURL('https://www.linkedin.com/company/net-natives/') // old style page
  // win.loadURL('https://www.linkedin.com/company-beta/305751/') // new style page
  win.loadURL(obj.url)

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  return resolve(_.merge(obj, {win}))
})

const getPathname = obj => new Promise((resolve, reject) => {
  // on browser load finish
  obj.win.webContents.on('did-finish-load', () => {
    // execute js to get pathname
    obj.win.webContents.executeJavaScript('location.pathname', pathname => {
      return resolve(_.merge({pathname}, obj))
    })
  })
})

const getFollowers = obj => new Promise((resolve, reject) => {
  // holder for query selector
  let querySelector = ''

  // check pathname
  if (obj.pathname.indexOf('/school/') !== -1 || obj.pathname.indexOf('/company-beta/') !== -1) {
    // new style page
    querySelector = '.org-top-card-module__followers-count'
  } else if (obj.pathname.indexOf('/biz/') !== -1 || obj.pathname.indexOf('/company/') !== -1) {
    // old style page
    querySelector = '.followers-count'
  }

  // use query selector to get followers
  if (querySelector) {
    setTimeout(() => {
      obj.win.webContents.executeJavaScript(`document.querySelector('${querySelector}').innerText`, text => {
        // add followers to results
        obj.result.followers = parseInt(text.match(/\d/g).join(''))
        return resolve(obj)
      })
    }, 2000)
  }
})

const getCompanyId = obj => new Promise((resolve, reject) => {
  // attempt to get company id from pathname
  let companyId = parseInt(obj.pathname.match(/\d/g) ? obj.pathname.match(/\d/g).join('') : NaN)

  // no company id, so get it from webpage
  if (!companyId) {
    setTimeout(() => {
      obj.win.webContents.executeJavaScript('parseInt(document.body.innerHTML.match(/companyId=\\d+/g)[0].match(/\\d+/g)[0])', id => {
        if (id) {
          return resolve(_.merge(obj, {companyId: id}))
        } else {
          return reject(new Error('No Company Id Found.'))
        }
      })
    }, 2000)
  } else {
    return resolve(_.merge(obj, {companyId}))
  }
})

const getCompanyUpdates = (obj) => new Promise((resolve, reject) => {
  let startIndex = 0
  let endIndex = 20 // set to null if you want to look at all posts
  let queue = []

  const buildFeed = index => {
    let updatesUrl = `https://www.linkedin.com/biz/${obj.companyId}/feed?start=${index}`

    jsdom.env(updatesUrl, (err, window) => {
      if (err) { return reject(err) }

      if (!window.document.body.innerHTML) {
        return getPosts()
      }

        // posts holder
      obj.result.posts = []

      let feedItems = window.document.getElementsByClassName('feed-item')

      _.each(feedItems, feedItem => {
        queue.push(cb => {
          let prom = new Promise((resolve, reject) => {
            obj.win.loadURL(`https://www.linkedin.com${feedItem.attributes[_.findIndex(feedItem.attributes, {'name': 'data-li-single-update-url'})].value}`)
            // on browser load finish
            obj.win.webContents.on('did-finish-load', () => {
              // execute js to get body
              obj.win.webContents.executeJavaScript('document.body.innerText', body => {
                try {
                  let post = JSON.parse(body)
                  obj.result.posts.push({
                    createdDate: post.updates[0].createdDate,
                    // commentary: post.updates[0].commentary[0].plain.text,
                    // description: post.updates[0].content.article.description,
                    // title: post.updates[0].content.article.title,
                    // url: post.updates[0].content.article.url,
                    likeCount: post.updates[0].action[0].like.count,
                    commentCount: post.updates[0].action[1].comment.count
                  })

                  if (post) {
                    return resolve(post)
                  }
                } catch (err) {
                  // catch if anything goes wrong
                  return reject(err)
                }
              })
            })
          })

          prom.then(post => {
            return cb()
          }).catch(err => {
            console.log(err)
            return cb()
          })
        })
      })

      if (!endIndex || (index < endIndex)) {
        return buildFeed(index + 10)
      } else {
        return getPosts()
      }
    })
  }

  const getPosts = () => {
    async.series(queue, () => resolve(obj))
  }

  buildFeed(startIndex)
})

const closeWindow = obj => new Promise((resolve, reject) => {
  obj.win.close()
  resolve(obj)
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  startScrape(url)
    .then(createWindow)
    .then(getPathname)
    .then(getFollowers)
    .then(getCompanyId)
    .then(getCompanyUpdates)
    .then(obj => {
      console.log(`Pathname: ${obj.pathname}`)
      console.log(`CompanyId: ${obj.companyId}`)
      console.log(`Followers: ${obj.result.followers}`)
      console.log(`Posts: ${JSON.stringify(obj.result.posts)}`)
      return Promise.resolve(obj)
    })
    .then(closeWindow)
    .catch(err => console.log(err))
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  app.quit()
})
