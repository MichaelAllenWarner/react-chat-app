const HOST = location.origin.replace(/^http/, 'ws');
const ws = new WebSocket(HOST);

const ids = {}; // one publicid, one privateid, server will send

// set up websocket behavior
setUpMsgSending();
setUpMsgReceiving();

setUpMenuDropdown();

setUpResponsiveLayout();




function setUpMsgSending() {
  const messageInput = document.querySelector('#message-input');
  const usernameInput = document.querySelector('#username-input');

  messageInput.addEventListener('keydown', sendMsgCallback());
  usernameInput.addEventListener('keydown', sendMsgCallback());

  // should we allow line breaks within a message?

  function sendMsgCallback() {
    return function sendMsgHandler(event) {
      const oldUsernameWithYou = document.querySelector('#own-user').textContent;
      const oldUsername = oldUsernameWithYou.substring(0, oldUsernameWithYou.length - 6);
      if (event.key === 'Enter'
          && (messageInput.value || usernameInput.value !== oldUsername)) {
        const outgoingMsgObj = {
          type: 'text',
          privateid: ids.privateid,
          publicid: ids.publicid,
          username: usernameInput.value,
          time: Date.now(),
          text: messageInput.value.trimStart()
        };
        ws.send(JSON.stringify(outgoingMsgObj));
        messageInput.value = '';
      }
    };
  }
}

function setUpMsgReceiving() {
  ws.onmessage = (incomingMsgObj) => {
    console.log(incomingMsgObj);
    const msgData = JSON.parse(incomingMsgObj.data);

    switch (msgData.type) {
      case 'ids':
        ids.publicid = msgData.yourPublicid;
        ids.privateid = msgData.yourPrivateid;
        break;
      case 'error':
        communicateError();
        break;
      case 'users':
        updateUsernamesList(msgData.usernames, ids.publicid);
        break;
      case 'text':
        processNewTextMsg(ids.publicid);
        break;
    }

    function communicateError() {
      if (msgData.error = 'takenUsername') {
        const usernameLabel = document.querySelector('#username-label');

        const usernameItemsArr = Array.from(document.querySelectorAll('li'));
        const takenUsernameItem = usernameItemsArr.find(usernameItem =>
          usernameItem.getAttribute('data-publicid') === msgData.publicidOfTakenUsername);

        usernameLabel.addEventListener('animationend', removeClass('bad-username'), { once: true });
        takenUsernameItem.addEventListener('animationend', removeClass('taken-username'), { once: true });

        usernameLabel.classList.add('bad-username');
        takenUsernameItem.classList.add('taken-username');

        function removeClass(classToRemove) {
          return function() {
            this.classList.remove(classToRemove);
          };
        }
      }
    }

    function updateUsernamesList(usernamesObj, ownPublicid) {
      const usernamesList = document.querySelector('#usernames-list');
      while (usernamesList.firstChild) {
        usernamesList.removeChild(usernamesList.firstChild);
      }

      const ownUserItem = document.createElement('li');
      ownUserItem.id = 'own-user';
      ownUserItem.setAttribute('data-publicid', ownPublicid);
      usernamesList.appendChild(ownUserItem);

      for (const [publicid, username] of Object.entries(usernamesObj)) {
        if (publicid === ownPublicid) {
          ownUserItem.textContent = (username) ? `${username} (You)` : 'An anonymous user (You)';
        } else {
          const usernameItem = document.createElement('li');
          usernameItem.textContent = username || 'An anonymous user';
          usernameItem.setAttribute('data-publicid', publicid);
          usernamesList.appendChild(usernameItem);
        }
      }
    }

    function processNewTextMsg(ownPublicid) {
      const text = msgData.text.trimStart();
      if (text) {
        const publicid = msgData.publicid;
        const username = (!msgData.username) ? 'An anonymous user' : msgData.username;
        const time = new Date(msgData.time);

        const newMsg = document.createElement('p');
        const msgClass = (publicid === ownPublicid) ? 'own-message' : 'other-message';
        newMsg.classList.add(msgClass);
        newMsg.setAttribute('data-time', time);

        const usernamePrefix = document.createElement('span');
        usernamePrefix.textContent = `${username}: `;
        usernamePrefix.classList.add('username-prefix');

        const textNode = document.createTextNode(text);

        newMsg.appendChild(usernamePrefix);
        newMsg.appendChild(textNode);

        const messages = document.querySelector('#messages');
        const scrHgt = messages.scrollHeight;
        const scrTop = messages.scrollTop;
        const cliHgt = messages.clientHeight;
        const messagesWasScrolledDown = (scrHgt - scrTop <= cliHgt + 5);

        messages.appendChild(newMsg);

        // scroll down messages if already was (nearly) scrolled down
        if (messagesWasScrolledDown) {
          messages.scrollTop = messages.scrollHeight - messages.clientHeight; 
        }
      }
    }
  }
}

function setUpMenuDropdown() {
  const menuLogo = document.querySelector('#menu-logo');
  const menu = document.querySelector('#menu');
  menuLogo.addEventListener('click', () => {
    menu.classList.toggle('menu-in');
    menu.classList.toggle('menu-out');
  });
  document.addEventListener('touchstart', hideMenuCallback());
  document.addEventListener('click', hideMenuCallback());

  function hideMenuCallback() {
    return event => {
      if (menu.classList.contains('menu-in')
          && !menu.contains(event.target)
          && !menuLogo.contains(event.target)) {
        menuLogo.click();
      }
    };
  }
}


function setUpResponsiveLayout() {

  // initialize real viewport height CSS variable
  setRealViewportHeight();


  // use media query to catch soft-keyboard toggles (hopefully!) and handle them specially

  const softKeyboardToggleMQ = window.matchMedia('screen and (max-height: 501px)');
  softKeyboardToggleMQ.addListener(softKeyboardToggleMQCallback(setRealViewportHeight, scrollDownMessages, scrollToActiveElIfNeeded));

  function softKeyboardToggleMQCallback(setRealViewportHeight, scrollDownMessages, scrollToActiveElIfNeeded) {
    return () => {
      // immediately scroll down messages & reset height on soft-keyboard toggle
      setRealViewportHeight();
      scrollDownMessages();

      // if keyboard now up, scroll to active element as needed and then blur() on submit (misses mobile Safari)
      const softKeyboardNowUp = softKeyboardToggleMQ.matches;
      if (softKeyboardNowUp) {
        scrollToActiveElIfNeeded();
        document.activeElement.addEventListener('keyup', hideSoftKeyboard);

        function hideSoftKeyboard(event) {
          if (event.key === 'Enter') {
            this.blur();
            this.removeEventListener('keyup', hideSoftKeyboard);
          }
        };
      }
    };
  }


  // if resize isn't likely to be a soft-keyboard toggle, use debouncing

  window.addEventListener('resize', resizeCallback(setRealViewportHeight, scrollDownMessages, scrollToActiveElIfNeeded));

  function resizeCallback(setRealViewportHeight, scrollDownMessages, scrollToActiveElIfNeeded) {
    let resizeTimer;

    return () => {

      // if it's likely mobile landscape, don't wait for debounce to adjust height
      const resizeImmediately = window.matchMedia('screen and (min-width: 601px) and (max-height: 350px)').matches;
      if (resizeImmediately) {
        setRealViewportHeight();
      }

      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        scrollDownMessages();

        // only resize if the soft-keyboard toggle handler didn't already take care of it
        const realViewportHeight = window.innerHeight * 0.01;
        const currCSSVal = document.documentElement.style.getPropertyValue('--vh');
        if (`${realViewportHeight}px` !== currCSSVal) {
          setRealViewportHeight();
        }
        scrollToActiveElIfNeeded();
      }, 250);
    };
  }


  // responsiveness helper functions:

  function scrollToActiveElIfNeeded() {
    const messageInput = document.querySelector('#message-input');
    const usernameInput = document.querySelector('#username-input');
    const activeEl = document.activeElement;
    const mustScroll = (activeEl === messageInput || activeEl === usernameInput);

    if (mustScroll) {
      activeEl.parentNode.scrollIntoView(false);
      const gridWrapper = document.querySelector('#grid-wrapper');
      if (gridWrapper.scrollTop > 0) {
        gridWrapper.scrollBy(0, 1);
      }
    }
  }

  function setRealViewportHeight() {
    const realViewportHeight = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${realViewportHeight}px`);
  }

  function scrollDownMessages() {
    const messages = document.querySelector('#messages');
    messages.scrollTop = messages.scrollHeight - messages.clientHeight;
  }
}
