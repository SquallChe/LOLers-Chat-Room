var timeOutId = -1;
var twinkleId = -1;

window.onload = function () {
  var hichat = new HiChat();
  hichat.init();
};

//definate chat class
var HiChat = function () {
  this.socket = null;
  this.userId = '';
  this.iconIndex = -1;
  this.nickname = '';
  //this.timeOutId = -1;
};

//function HiChat() { 
//  this.socket = null;
//}

//add method
HiChat.prototype = {
  init: function () {//initial
    var that = this;
    //create connection to server
    this.socket = io.connect();
    //listen connect event
    this.socket.on('connect', function () {
      //when connected ,show input area
      document.getElementById('info').textContent = 'please input nickname';
      document.getElementById('nickWrapper').style.display = 'block';
      document.getElementById('nicknameInput').focus();
      document.getElementById('headIcon').style.display = 'block';
      document.getElementById('divSelected').style.display = 'block';
    });

    //nickname invalid
    this.socket.on('nickExisted', function () {
      document.getElementById('info').textContent = 'Nickname already existed..';
    });

    //success
    this.socket.on('loginSuccess', function (userId, iconIndex, nickname) {
      document.title = 'enjoy it';
      document.getElementById('loginWrapper').style.display = 'none';
      document.getElementById('bottomBar').style.display = 'block';
      document.getElementById('messageInput').focus();
      that.userId = userId;
      that.iconIndex = iconIndex;
      that.nickname = nickname;
    });

    //set confirm button for nickname
    document.getElementById('loginBtn').addEventListener('click', function () {
      var nickName = document.getElementById('nicknameInput').value;

      if (nickName.trim().length != 0) {

        that.socket.emit('login', nickName);
      } else {

        document.getElementById('nicknameInput').focus();
      };
    }, false);

    //join or left
    this.socket.on('system', function (nickName, users, type) {
      var userCount = users.length;
      var msg = nickName + (type == 'login' ? ' joined' : ' left');

      that.displayNewMsg('system', msg, 'red', null, 'historyMsg');

      //show x number
      document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' user') + ' online';
      that.initPanel(users, nickName);
    });

    //send message
    document.getElementById('sendBtn').addEventListener('click', function () {
      var messageInput = document.getElementById('messageInput'),
        msg = messageInput.value,
        color = document.getElementById('colorStyle').value;
      messageInput.value = '';
      messageInput.focus();
      if (msg.trim().length != 0) {
        that.socket.emit('postMsg', msg, color); //send message to server
      };
    }, false);

    //bind enter to public chat
    document.getElementById('messageInput').addEventListener('keydown', function (e) {
      if (e.keyCode == 13) {
        var value = $('#messageInput').val();
        if (value.trim() != '') {
          document.getElementById('sendBtn').click();
          event.returnValue = false;
          if (event.preventDefault) event.preventDefault();
        }
      }
    });

    //show broadcasted message
    this.socket.on('newMsg', function (user, msg, color, iconIndex) {
      that.displayNewMsg(user, msg, color, iconIndex, 'historyMsg');
    });

    document.getElementById('sendImage').addEventListener('change', function () {
      //check whether file selected
      if (this.files.length != 0) {
        //get file by FileReader
        var file = this.files[0],
             reader = new FileReader();
        if (!reader) {
          that.displayNewMsg('system', 'your browser doesn\'t support fileReader!!', 'red', 'historyMsg');
          this.value = '';
          return;
        };
        reader.onload = function (e) {
          //read succeeded,show it and send to server
          this.value = '';
          that.socket.emit('img', e.target.result);
          that.displayImage('me', e.target.result);
        };
        reader.readAsDataURL(file);
      };
    }, false);

    //show image
    this.socket.on('newImg', function (user, img) {
      that.displayImage(user, img);
    });

    //get private msg
    this.socket.on('newPrivateMsg', function (id, user, msg, iconIndex) {
      that.createWindow(id, user, '../content/headIcon/' + iconIndex + '.gif', false, that.socket, that.userId);
      that.displayPrivateMsg(user, msg, 'subMessage_' + id);

      if ($('#subWrapper_' + id).css('display') == 'none') {
        if ($('#taskImgWrapper_' + id).length == 0) {
          if(!$('img[name=' + id + ']').hasClass('jump')) {
            $('img[name=' + id + ']').addClass('jump');
            document.title = "new message!"
            that.imgJump(id, 250); 
          }
        }
        else {
          if(!$('#taskImgWrapper_' + id).hasClass('twinkling')) {
            $('#taskImgWrapper_' + id).addClass('twinkling');
            document.title = "new message!"
            that.barBgTwinkle(id, 500);  
          }
        }
      }
    });
    
    //video chat invited
    this.socket.on('videoChatInvited', function (inviterId, nickname, iconIndex) {
      var notice = '<div id="notice_' + inviterId + '" class="notice"><div class="message">Hey,' + nickname + ' wanna video chat with you</div><div><button name="' + inviterId + '" value="' + nickname + '∴' + iconIndex + '" class="refuse">refuse</button></div><div><button name="' + inviterId + '" value="' + nickname + '∴' + iconIndex + '" class="permit">permit</button></div></div>';
      $('#noticeWrapper').append(notice).fadeIn('200');
    });
    
    //refuse video chat msg
    this.socket.on('refuseVideoMsg', function (id, nickname) {
      that.displayPrivateMsg('<font color=red>system</font>', nickname + ' refused your video chat request' , 'subMessage_' + id);
    });
    
    //listen video event
    document.getElementById('noticeWrapper').addEventListener('click', function (e) {
      var target = e.target;
      if (target.nodeName.toLowerCase() == 'button') {
        if(target.className == 'permit') {
          var array = target.value.split('∴');
          that.createWindow(target.name, array[0], '../content/headIcon/' + array[1] + '.gif', true, that.socket, that.userId);
          that.showVideo(that.userId, target.name);
          $('#notice_' + target.name).remove();
        }
        else if(target.className == 'refuse') {
          that.socket.emit('refuseVideoChat', target.name);
          $('#notice_' + target.name).remove();
        }
        if($('#noticeWrapper .notice').length == 0)
            $('#noticeWrapper').hide();
      }
    });

    //show emoji panel
    this.initialEmoji();
    document.getElementById('emoji').addEventListener('click', function (e) {
      var emojiwrapper = document.getElementById('emojiWrapper');
      emojiwrapper.style.display = 'block';
      e.stopPropagation();
    }, false);

    document.body.addEventListener('click', function (e) {
      var emojiwrapper = document.getElementById('emojiWrapper');
      var bgwrapper = document.getElementById('bgWrapper');
      if (e.target != emojiwrapper) {
        emojiwrapper.style.display = 'none';
      };
      if (e.target != bgwrapper) {
        bgwrapper.style.display = 'none';
      };
    });

    document.getElementById('emojiWrapper').addEventListener('click', function (e) {
      //get selected emoji
      var target = e.target;
      if (target.nodeName.toLowerCase() == 'img') {
        var messageInput = document.getElementById('messageInput');
        messageInput.focus();
        messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
      };
    }, false);

    document.getElementById('clearBtn').addEventListener('click', function (e) {
      //clear screen
      that.clearScreen();
    }, false);

    that.initialHeadIcon();

    document.getElementById('headIcon').addEventListener('click', function (e) {
      //get selected head
      var target = e.target;
      if (target.nodeName.toLowerCase() == 'img') {
        that.socket.emit('selectIcon', target.title);
        document.getElementById('imgSelected').src = target.src;
      };
    }, false);

    //background
    that.initialBg();
    document.getElementById('btnBg').addEventListener('click', function (e) {
      var bgWrapper = document.getElementById('bgWrapper');
      bgWrapper.style.display = 'block';
      e.stopPropagation();
    }, false);

    document.getElementById('bgWrapper').addEventListener('click', function (e) {
      //get selected emoji
      var target = e.target;
      if (target.nodeName.toLowerCase() == 'img') {
        var messageInput = document.getElementById('messageInput');
        messageInput.focus();
        $('#historyMsg').css('background-image', 'url(content/bg/bg' + target.title + '.gif)');
      };
    }, false);

    //add panel click
    document.getElementById('userPanel').addEventListener('click', function (e) {
      //get selected head
      var target = e.target;
      if (target.nodeName.toLowerCase() == 'img') {

        if (target.name != "") {
          //stop jumped image
          if (timeOutId > -1) {
            clearTimeout(timeOutId);
            $('img[name=' + target.name + ']').removeClass();
          }
          //create sub window
          that.createWindow(target.name, target.title, target.src, true, that.socket, that.userId);



          that.addIconToBottom(target.name, target.src, target.title);
          if(!$('img').hasClass('jump')) {
            document.title = 'enjoy it';
          }
        }
      };
    }, false);

    //bind panel
    that.bindPanel();

  },

  //show message
  displayNewMsg: function (user, msg, color, iconIndex, placeId) {
    var container = document.getElementById(placeId),
         msgToDisplay = document.createElement('p'),
         date = new Date().toTimeString().substr(0, 8),
    //change to image
         msg = this.showEmoji(msg);
    msgToDisplay.style.color = color || '#000';
    if (iconIndex != null)
      msgToDisplay.innerHTML = '<img src="../content/headIcon/' + iconIndex + '.gif" style="width:40px;height:40px;">' + user + '<span class="timespan">(' + date + '): </span>' + msg;
    else
      msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },

  //show image
  displayImage: function (user, imgData, color) {
    var container = document.getElementById('historyMsg'),
        msgToDisplay = document.createElement('p'),
        date = new Date().toTimeString().substr(0, 8);
    msgToDisplay.style.color = color || '#000';
    msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
    container.appendChild(msgToDisplay);
    container.scrollTop = container.scrollHeight;
  },

  //show private message
  displayPrivateMsg: function (nickname, msg, placeId) {
    var container = document.getElementById(placeId),
        date = new Date(),
        titleClass = nickname == this.nickname ? "yourSelf" : "theOther",
        content = '<dl><dt class="' + titleClass + '">' + nickname + ' ' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDay() + ' ' + date.toTimeString().substring(0, 8) + '</dt>'
                + '<dd>' + msg + '</dd></dl>';
    $('#' + placeId).append(content);
    container.scrollTop = container.scrollHeight;
  },

  //initialize emoji
  initialEmoji: function () {
    var emojiContainer = document.getElementById('emojiWrapper'),
        docFragment = document.createDocumentFragment();
    for (var i = 69; i > 0; i--) {
      var emojiItem = document.createElement('img');
      emojiItem.src = '../content/emoji/' + i + '.gif';
      emojiItem.title = i;
      docFragment.appendChild(emojiItem);
    }
    emojiContainer.appendChild(docFragment);
  },

  //initialize head icon
  initialHeadIcon: function () {
    var iconContainer = document.getElementById('headIcon'),
        docFragment = document.createDocumentFragment();
    for (var i = 7; i > 0; i--) {
      var iconItem = document.createElement('img');
      iconItem.src = '../content/headIcon/' + i + '.gif';
      iconItem.title = i;
      iconItem.width = 50;
      iconItem.height = 50;
      iconItem.style.cursor = 'pointer';
      docFragment.appendChild(iconItem);
    }
    iconContainer.appendChild(docFragment);
  },

  showEmoji: function (msg) {
    var match, result = msg,
        reg = /\[emoji:\d+\]/g,
        emojiIndex,
        totalEmojiNum = document.getElementById('emojiWrapper').children.length;
    while (match = reg.exec(msg)) {
      emojiIndex = match[0].slice(7, -1);
      if (emojiIndex > totalEmojiNum) {
        result = result.replace(match[0], '[X]');
      } else {
        result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');
      };
    };
    return result;
  },

  clearScreen: function () {
    var parent = document.getElementById("historyMsg");
    var children = parent.childNodes;
    for (var i = children.length - 1; i >= 0; i--) {
      parent.removeChild(children[i]);
    }
  },

  //initialize bg
  initialBg: function () {
    var bgContainer = document.getElementById('bgWrapper'),
        docFragment = document.createDocumentFragment();
    for (var i = 2; i > 0; i--) {
      var bgItem = document.createElement('img');
      bgItem.src = '../content/bg/bg' + i + '.gif';
      bgItem.title = i;
      docFragment.appendChild(bgItem);
    }
    bgContainer.appendChild(docFragment);
  },

  initPanel: function (users, nickname) {
    var content = '<div class="header"><img src="../content/headIcon/' + this.iconIndex + '.gif" class="icon">' + this.nickname + '<span id="panelMinimize">-</span></div><ul id="ulOnline">';
    for (var i = 0; i < users.length; i++) {
      if (users[i].userId != this.userId)
      //content += '<li><img src="../content/headIcon/' + users[i].iconIndex + '.gif" style="width:40px;height:40px;" ondblclick="sendPrivateMsg(\'' + this.userId + '\',\'' + users[i].userId + '\',' + socket + ');">' + users[i].nickname + '</li>';
        content += '<li><img name="' + users[i].userId + '" src="../content/headIcon/' + users[i].iconIndex + '.gif" title="' + users[i].nickname + '">' + users[i].nickname + '</li>';
    }
    content += '</ul>';
    $('#userPanel').html(content);
  },

  createWindow: function (id, nickname, imgSrc, show, socket, myId) {
    if ($('#subWrapper_' + id).length == 0) {
      $('body').prepend('<div id="subWrapper_' + id + '" class="subWin"><div id="subHeader_' + id + '"><img src="' + imgSrc + '" class="icon"/> ' + nickname + '<span id="subClose_' + id + '">X</span><span id="subMinimize_' + id + '">-</span></div><div class="subChat"><div id="subMessage_' + id + '" class="subMessage"></div><div class="subToolBar"><img id="barVideo_'+ id + '" src="../content/images/video.png"/></div><div id="divInputArea_' + id + '"><div><textarea id="subInput_' + id + '" class="subInput"/></div></div><div class="footer"><input id="subSend_' + id + '" type="button" value="send" class="subSend"/></div></div><div id="subVideo_' + id + '" class="subVideo"></div></div>');
      $('#subWrapper_' + id).draggable();
    
      //listen private send click
      document.getElementById('subSend_' + id).addEventListener('click', function () {
        var msg = $('#subInput_' + id).val();
        if (msg.trim().length > 0) {
          $('#subInput_' + id).val('').focus();
          socket.emit('postPrivateMsg', msg, id);
        }
      });
      
      //listen minimize click
      document.getElementById('subMinimize_' + id).addEventListener('click', function () {
        $('#subWrapper_' + id).hide();
      });
      
      //listen sub window close click
      document.getElementById('subClose_' + id).addEventListener('click', function () {
        $('#subWrapper_' + id).remove();
        $('#taskImgWrapper_' + id).remove();
      });
      
      //private enter key
      document.getElementById('subInput_' + id).addEventListener('keydown', function (e) {
        if (e.keyCode == 13) {
          var value = $('#subInput_' + id).val();
          if (value.trim() != '') {
            document.getElementById('subSend_' + id).click();
            event.returnValue = false;
            if (event.preventDefault) event.preventDefault();
          }
        }
      });
      
      document.getElementById('barVideo_' + id).addEventListener('click', function () {
        HiChat.prototype.showVideo(myId, id);
        socket.emit('videoChat', id);
      });
    }
    if (show)
      $('#subWrapper_' + id).show();
  },

  bindPanel: function () {
    $('#userPanel').draggable();
    $(document).on('click', '#panelMinimize', function () {
      $('#userPanel').hide();
    });
    $('#panelTrigger').click(function () {
      $('#userPanel').fadeToggle(200);
    });
  },

  imgJump: function (name, interval) {
    timeOutId = setTimeout(function () {
      $('img[name=' + name + ']').addClass('up');
      timeOutId = setTimeout(function () {
        $('img[name=' + name + ']').removeClass('up');
        timeOutId = setTimeout(function () {
          $('img[name=' + name + ']').addClass('down');
          timeOutId = setTimeout(function () {
            $('img[name=' + name + ']').removeClass('down');
            HiChat.prototype.imgJump(name, interval);
          }, interval);
        }, interval);
      }, interval);
    }, interval);
  },

  barBgTwinkle: function (id, interval) {
    twinkleId = setTimeout(function () {
      $('#taskImgWrapper_' + id).addClass('twinkle');
      twinkleId = setTimeout(function () {
        $('#taskImgWrapper_' + id).removeClass('twinkle');
        twinkleId = HiChat.prototype.barBgTwinkle(id, interval);
      }, interval);
    }, interval);
  },

  addIconToBottom: function (userId, imgSrc, nickname) {
    if ($('#img_' + userId).length == 0) {
      var icon = '<div id="taskImgWrapper_' + userId + '" class="imgWrapper"><img id="img_' + userId + '" src="' + imgSrc + '" /><span>' + nickname + '</span></div>';
      $('#bottomBar').append(icon);

      $('#taskImgWrapper_' + userId).click(function () {
        clearTimeout(twinkleId);
        $('#taskImgWrapper_' + userId).removeClass('twinkling twinkle');
        $('#subWrapper_' + userId).toggle();
        //if($)
      });
    }
  },
  
  showVideo:function(myId, userId){
    var queryString = '?liveName=' + myId + '&playName=' + userId;
    var iframeHtml = '<iframe id="iVideo" src="video.html' + queryString + '" frameborder="0" width="100%" height="100%"></iframe>';
    $('#subVideo_' + userId).html(iframeHtml);
    $('#subWrapper_' + userId).css('width','600px');
    $('#subVideo_' + userId).show();
  }

};