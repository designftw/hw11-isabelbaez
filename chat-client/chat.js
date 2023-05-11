import * as Vue from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'
import { mixin } from "https://mavue.mavo.io/mavue.js";
import GraffitiPlugin from 'https://graffiti.garden/graffiti-js/plugins/vue/plugin.js'
import Resolver from './resolver.js'

const app = {
  // Import MaVue
  mixins: [mixin],

  // Import resolver
  created() {
    this.resolver = new Resolver(this.$gf)
  },

  setup() {
    // Initialize the name of the channel we're chatting in
    const channel = Vue.ref('default')

    // And a flag for whether or not we're private-messaging

    // If we're private messaging use "me" as the channel,
    // otherwise use the channel value
    const $gf = Vue.inject('graffiti')

    const context = Vue.computed(()=> [channel.value])

    // Initialize the collection of messages associated with the context
    const { objects: messagesRaw } = $gf.useObjects(context)

    //const { objects: allMessagesRaw } = $gf.useObjects()
    return { channel, messagesRaw }
  },

  mounted() {
    setTimeout(function () {
      const mainSec = document.getElementById("mainSection");
      mainSec.style.display = "none";
    }, 200)
  },

  data() {
    // Initialize some more reactive variables
    return {
      messageText: '',
      username: '',
      editID: '',
      editText: '',
      usernameRecipient: '',
      recepient: '',
      userChannels: [],
      showingChannels: false,
      showingChats: false,
      allMessages: [],
      privChats: [],
      newChat: false,
      allUserIds: [],
      privUsers: [],
      actorsToUsernames: {},
      notifyBad: false,
      badUsername: false,
      file: null,
      downloadedImages: {},
      usernameChanged: false,
      myGroups: null,
      currGroup: {id: '', name: '', participants: []},
      seeingParticipants: {value: false},
    }
  },
  
  watch: {
    'currGroup.id': function() {
      console.log('LA CRICAAA', this.currGroup.name);

      if (this.channel == 'default') {
        const mainSec = document.getElementById("mainSection");
        mainSec.style.display = "none";
        this.channel = this.currGroup.id;
        const groupp = document.getElementsByClassName("groupStuff");
        groupp[0].style.width = "29%"
        
        console.log(groupp[0].style.width);


        setTimeout(function () {
          const groupp = document.getElementsByClassName("groupStuff");
          groupp[0].style.transition = "none"
          groupp[0].style.width = "100%"
          const mainSec = document.getElementById("mainSection");
          mainSec.style.display = "block";
        }, 2000)
      } else {
        this.channel = this.currGroup.id;
      }

      console.log(this.channel);

    },
    async messages(newMessages) {
      for (const message of newMessages) {
        if (!this.actorsToUsernames[message.actor]) {
          this.actorsToUsernames[message.actor] = await this.resolver.actorToUsername(message.actor);
        }
      }

      let imgMessages = newMessages.filter(m=>
        m.attachment && m.attachment.type && m.attachment.type == "Image"
        && typeof m.attachment.magnet == "string"
      );
      for (const imgMessage of imgMessages) {
        if (!this.downloadedImages[imgMessage.attachment.magnet]) {

          try {
            const imgURI = await this.$gf.media.fetch(imgMessage.attachment.magnet);
            const url = URL.createObjectURL(imgURI);
            this.downloadedImages[imgMessage.attachment.magnet] = url;
          } catch (e) {
            console.log(e);
          }

        }
      }
    }
  },

  computed: {
    messages() {
      if (this.reCompute) {

      }
      let messages = this.messagesRaw
        // Filter the "raw" messages for data
        // that is appropriate for our application
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
        .filter(m=>
          // Does the message have a type property?
          m.type         &&
          // Is the value of that property 'Note'?
          m.type=='Note' &&
          // Does the message have a content property?
          m.content      &&
          // Is that property a string?
          typeof m.content=='string') 

      messages = messages
        // Sort the messages with the
        // most recently created ones first
        .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
        // Only show the 10 most recent ones
        .slice(0,10)

        .sort((m1, m2)=> new Date(m1.published) - new Date(m2.published))
      console.log('getting', messages);
      return messages
    },
  },
  methods: {

    timeSincePosted(past) {
      const today = new Date();
      const posted = new Date(past);

      const sec = Math.floor((today.getTime() - posted.getTime())/1000);
      const min = Math.floor((today.getTime() - posted.getTime())/1000/60);
      const hour = Math.floor((today.getTime() - posted.getTime())/1000/60/60);
      const day = Math.floor((today.getTime() - posted.getTime())/1000/60/60/24);

      if (sec < 60) {
        return sec + " seconds";
      } else {
        if (min >= 60) {
          if (hour >= 24) {
            if (day == 1) {
              return day + " day";
            } else {
              return day + " days";
            }
          } else if (hour == 1) {
            return hour + " hour";
          } else {
            return hour + " hours";
          }
        } else if (min == 1) {
          return min + " minute";
        } else {
          return min + " minutes";
        }
      }

    },

    async openChat(id) {
      this.usernameRecipient = id;
      this.newChat = true;
      await this.updateRecipient();
    },

    startNewChat() {
      this.usernameRecipient = '';
      this.recepient = '';
      this.newChat = true;
    },

    scrollMessages() {
      const chatMessages = document.getElementById("chatMessages");
      chatMessages.style.boxShadow = "inset 0px 7px 10px -5px #999999, inset 0px -7px 10px -5px #999999";
      setTimeout(function () {
        chatMessages.style.boxShadow = "none";
      }, 7000);
    },

    async updateMessages() {
      let messages = this.messagesRaw
      // Filter the "raw" messages for data
      // that is appropriate for our application
      // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
      .filter(m=>
        // Does the message have a type property?
        m.type         &&
        // Is the value of that property 'Note'?
        m.type=='Note' &&
        // Does the message have a content property?
        m.content      &&
        // Is that property a string?
        typeof m.content=='string') 

        // Do some more filtering for private messagin
        messages = messages
          // Sort the messages with the
          // most recently created ones first
          .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
          // Only show the 10 most recent ones
          .slice(0,10)

        this.messages = messages;
    },
    
    async updateRecipient() {
      let user;

      for (const userInfo of this.privUsers) {
        if (this.usernameRecipient === userInfo[1]) {
          user = userInfo[0];
        }
      }

      if (!user) {
        user = await this.resolver.usernameToActor(this.usernameRecipient);
      }

      if (user) {
        this.recepient = user; 
        this.notifyBad = false;
      } else {
        if (this.usernameRecipient !== '') {
          this.notifyBad = true;
        }
        this.recepient = ''; 
      }
    },

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file;
      // Do something with the file!
    },

    async showChannels() {
      if (this.showingChannels) {
        this.showingChannels = false;
      } else {
        this.showingChannels = true;
        await this.getUserChannels();
      }
    },

    async showChats() {
      this.showingChats = !this.showingChats;
    },

   async getUserChannels () {
      const allUserChannels = await this.$gf.myContexts();
      const userPublicChannels = [];
      for (const channel of allUserChannels) {
        if (!channel.includes('graffiti') && channel !== "designftw.mit.edu" && channel !== "default") {
          userPublicChannels.push(channel);
        }
      }
      this.userChannels = userPublicChannels;
    },

    async getPrivateChats() {

      setTimeout(function(privchats) {
      }, 1000, [this.privChats]);

      setTimeout(this.updatePrivChats, 100);
    },

    async updatePrivChats() {
      const userChats = [];
      
      for (const actor of this.privChats) {
        let username = this.actorsToUsernames[actor[0]];

        if (!username) {
          username = await this.resolver.actorToUsername(actor[0]);
        }

        // while (!username) {
        //   username = await this.resolver.actorToUsername(actor[0]);
        // }
        userChats.push([actor[0], username]); 
      }
      this.privUsers = userChats;
    },

    async sendMessage() {
      const message = {
        type: 'Note',
        content: this.messageText,
      }

      // The context field declares which
      // channel(s) the object is posted in
      // You can post in more than one if you want!
      // The bto field makes messages private

      message.context = [this.channel]

      if (this.file) {
        const fileURI = await this.$gf.media.store(this.file);
        message.attachment = {};
        message.attachment.type = "Image";
        message.attachment.magnet = fileURI;
        this.file = null;
      }

      // Send!
      const postedMsg = this.$gf.post(message);

      this.messageText = '';
      function msgMove(messageId) {
        
        function msgMoveBack(messageId) {
          let messageElem = document.getElementById("message-" + messageId);

          if (!messageElem) {
            messageElem = document.getElementById("myMessage-" + messageId);
            messageElem.style.transform = 'translate(40%)';
          } else {
            messageElem.style.transform = 'translate(100%)';
          }
        }

        let messageElem = document.getElementById("message-" + messageId);

        if (!messageElem) {
          messageElem = document.getElementById("myMessage-" + messageId);
        }

        messageElem.style.transform = 'translate(0%)';
        setTimeout(msgMoveBack, 200, [messageId]);
      }
      //setTimeout(msgMove, 300, [postedMsg.id]);

      setTimeout(function () {
        const messageCotainer = document.getElementById("chatMessages");
        messageCotainer.scrollTop = messageCotainer.scrollHeight - messageCotainer.clientHeight;
      }, 400);

      this.getPrivateChats();
    
      // messageElem.style.transform = 'translate(50vw)'
    },

    removeMessage(message) {
      let messageElem = document.getElementById("message-" + message.id);

      if (!messageElem) {
        messageElem = document.getElementById("myMessage-" + message.id);
      }
      messageElem.style.transform = 'translate(50vw)'

      this.$gf.remove(message);
      this.getPrivateChats();
    },

    startEditMessage(message) {
      // Mark which message we're editing
      this.editID = message.id
      // And copy over it's existing text
      this.editText = message.content
    },

    saveEditMessage(message) {
      // Save the text (which will automatically
      // sync with the server)
      message.content = this.editText
      // And clear the edit mark
      this.editID = ''
    },

    async changeUsername() {
      try {
        this.badUsername = false;
        await this.resolver.requestUsername(this.username);
        const userInput = document.getElementById('username');

        userInput.style.backgroundColor = 'rgb(165, 236, 165)';
        setTimeout(function () {
          userInput.style.backgroundColor = 'rgb(238, 238, 238)';
        }, 700);

      } catch (e) {
        this.badUsername = true;
      }
      
    }
  }
}

const Profile = {
  props: ['actor', 'editable', 'downloadedimages'],

  setup(props) {
    // Get a collection of all objects associated with the actor
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },

  data() {
    return {
      editing: false,
      file: null,
      downloadedPic: null
    }
  },

  computed: {
    profilePic() {

      let profilePic = 
          this.objects
            // Filter the raw objects for profile data
            // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-profile
            .filter(m=>
              // Does the message have a type property?
              m.type &&
              // Is the value of that property 'Profile'?
              m.type=='Profile' &&
              // Does the message have a name property?
              m.icon &&
              // Is that property a string?
              m.icon.type == 'Image' &&

              m.icon.magnet &&

              typeof m.icon.magnet=='string')
            // Choose the most recent one or null if none exists
            .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null)
        return profilePic;
    }
  },

  watch: {
    async profilePic(newProfilePic) {

      if (!this.downloadedimages[newProfilePic.icon.magnet]) {
        try {
            const imgURI = await this.$gf.media.fetch(newProfilePic.icon.magnet);
    
            const url = URL.createObjectURL(imgURI);
            this.downloadedPic = url;

            this.downloadedimages[newProfilePic.icon.magnet] = url;
            
          } catch (e) {
            console.log(e);
          }
        } else {
          this.downloadedPic = this.downloadedimages[newProfilePic.icon.magnet];
        }

    }
  },

  methods: {
    editProfilePic() {
      this.editing = true
      // If we already have a profile,
      // initialize the edit text to our existing name
      // this.file = this.profile? this.profile.name : this.editText
    },

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file;
      // Do something with the file!
    },

    async saveProfilePic() {
      const fileURI = await this.$gf.media.store(this.file);

      const newPic = {
        type: 'Profile',
        icon: {}
      }
      newPic.icon.type = "Image";
      newPic.icon.magnet = fileURI;

      this.$gf.post(newPic);

      this.file = null;
      this.editing = false;
    }
  },
  template: '#profile'
}


const Name = {
  props: ['actor', 'editable'],

  setup(props) {
    // Get a collection of all objects associated with the actor
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },

  computed: {
    profile() {
      return this.objects
        // Filter the raw objects for profile data
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-profile
        .filter(m=>
          // Does the message have a type property?
          m.type &&
          // Is the value of that property 'Profile'?
          m.type=='Profile' &&
          // Does the message have a name property?
          m.name &&
          // Is that property a string?
          typeof m.name=='string')
        // Choose the most recent one or null if none exists
        .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null)
    }
  },

  data() {
    return {
      editing: false,
      editText: ''
    }
  },

  methods: {
    editName() {
      this.editing = true
      // If we already have a profile,
      // initialize the edit text to our existing name
      this.editText = this.profile? this.profile.name : this.editText
    },

    saveName() {
      if (this.profile) {
        // If we already have a profile, just change the name
        // (this will sync automatically)
        this.profile.name = this.editText
      } else {
        // Otherwise create a profile
        this.$gf.post({
          type: 'Profile',
          name: this.editText
        })
      }

      // Exit the editing state
      this.editing = false
    }
  },

  template: '#name'
}

const Like = {
  props: ["messageid", "actorid"],
  template: '#like',
  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: likesRaw } = $gf.useObjects([messageid])
    return { likesRaw }
  },
  computed: {
    likes() {
      let likes = this.likesRaw.filter(
        ( like =>
          // Does the message have a type property?
          like.type         &&
          // Is the value of that property 'Note'?
          like.type=='Like' &&
          // Does the message have a content property?
          like.object      &&
          // Is that property a string?
          like.object == this.messageid) 
        // Your filtering here
      )

      const messagesLikes = {};
      const newLikes = [];

      for (const like of likes) {
        if (messagesLikes[like.object]) {
          if (!messagesLikes[like.object].includes(like.actor)) {
            messagesLikes[like.object].push(like.actor);
            newLikes.push(like);
          } 
        } else {
          messagesLikes[like.object] = [like.actor];
          newLikes.push(like);
        }
      }
      likes = newLikes;
      return likes;
    },
    myLikes() {
      let myLikes = this.likesRaw.filter(
        ( like =>
          like.type         &&
          like.type=='Like' &&
          like.actor      &&
          like.object      &&
          like.object == this.messageid &&
          like.actor == this.$gf.me
      )
      )
      return myLikes;
    }
  },
  methods: {
    sendLike() {
      const like = {
          type: 'Like',
          object: this.messageid,
          actor: this.actorid,
          context: [this.messageid]
        }

      this.$gf.post(like)

      function bigSize(messageId) {

        function smallSize(messageId) {
          const dislikeElem = document.getElementById("dislike-" + messageId);
          dislikeElem.style.fontSize = '1.8vh';
        }

        const dislikeElem = document.getElementById("dislike-" + messageId);
        dislikeElem.style.fontSize = '3vh';

        setTimeout(smallSize, 500, [messageId]);
      }


      setTimeout(bigSize, 150, [this.messageid]);



    },
    removeLike() {
      const copyLikes = [];
      for (const like of this.myLikes) {
        this.$gf.remove(like);
        copyLikes.push(like);
      }

      for (let i = 0; i < copyLikes.length; i++) {
        this.myLikes.splice(i, 1); 
      }
      // this.myLikes = [];
    }
  }
}


const Read = {
  props: ["messageid", "actorid", "actorstousernames"],
  template: '#read',

  created() { // change to mounted instead? -> not guaranteed to be loaded so might want to watch? -> watch to remove is read more than once
    const readers = this.reads.map(read => read.actor);
    if (!readers.includes(this.$gf.me)) {
      const read = {

        type: 'Read',
        object: this.messageid,
        actor: this.$gf.me,
        context: [this.messageid]
      }

      this.$gf.post(read)
    }
  },
  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: readsRaw } = $gf.useObjects([messageid])
    return { readsRaw }
  },
  // data() {
  //   // Initialize some more reactive variables
  //   return {
  //     //actorsToUsernames: {},
  //   }
  // },
  // // watch: {
  // //   async reads(newReads) {
  // //     for (const read of newReads) {
  // //       if (!this.actorsToUsernames[read.actor]) {
  // //         this.actorsToUsernames[read.actor] = await this.resolver.actorToUsername(read.actor);
  // //       }
  // //     }
  // //     // const loader = document.getElementById('loader-'+ this.messageid);
  // //     // loader.style.display = "none";
  // //   }
  // // },
  computed: {
    reads() {
      let reads = this.readsRaw.filter(
        ( read =>
          // Does the message have a type property?
          read.type         &&
          // Is the value of that property 'Note'?
          read.type=='Read' &&
          // Does the message have a content property?
          read.object      &&
          // Is that property a string?
          read.object == this.messageid) 
        // Your filtering here
      )

      const messagesReads = {};
      const newReads = [];

      for (const read of reads) {
        if (messagesReads[read.object]) {
          if (!messagesReads[read.object].includes(read.actor)) {
            messagesReads[read.object].push(read.actor);
            newReads.push(read);
          } 
        } else {
          messagesReads[read.object] = [read.actor];
          newReads.push(read);
        }
      }
      reads = newReads;
      return reads;
    },
  },
  methods: {
    sendRead() {

      const read = {
        type: 'Read',
        object: this.messageid,
        actor: this.actorid,
        context: [this.messageid]
      }

      this.$gf.post(read)
    },

    username(actor) {
      if (this.actorstousernames[actor]) {
        return this.actorstousernames[actor];
      } else {
        return 'anonUser'
      }
    }
  }
}


const Reply = {
  props: ["messageid", "actorid", "actorstousernames"],
  template: '#reply',
  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: repliesRaw } = $gf.useObjects([messageid])
    return { repliesRaw }
  },

  data() {
    // Initialize some more reactive variables
    return {
      replyText: '',
      replying: false,
      viewing: false,
      editReplyText: '',
      editing: {},
    }
  },

  computed: {
    replies() {
      let replies = this.repliesRaw.filter(
        ( reply =>
          // Does the message have a type property?
          reply.type         &&
          // Is the value of that property 'Note'?
          reply.type== 'Note' &&
          // Does the message have a content property?
          reply.content      &&
          // Is that property a string?
          typeof reply.content == 'string'  &&

          reply.inReplyTo      &&
          // Is that property a string?
          reply.inReplyTo == this.messageid) 
        // Your filtering here
      )

      for (const reply of replies) {
        this.editing[reply.id] = false;
      }

      return replies;
    },
  },
  methods: {
    edit(reply) {
      this.editing[reply.id] = true;
      this.editReplyText = reply.content;
    },
    viewReplies() {
      if (!this.viewing) {
        this.viewing = true;
        const messageElem = document.getElementById("message-" + this.messageid);
        const height = messageElem.offsetHeight;
      } else {
        this.viewing = false;
        for (const reply of this.replies) {
          this.editing[reply.id] = false;
        }
      }
    },
    sendReply() {
      const reply = {
        type: 'Note',
        content: this.replyText,
        actor: this.actorid,
        inReplyTo: this.messageid,
        context: [this.messageid]
      }

      this.$gf.post(reply)
      this.replying = false;
      this.replyText = '';
      this.viewing = true;
    },
    editReply(reply) {
      // Save the text (which will automatically
      // sync with the server)
      reply.content = this.editReplyText;
      // And clear the edit mark
      this.editReplyText = '';
      this.editing[reply.id] = false;
    },
    removeReply(reply) {
      this.$gf.remove(reply)
    },
    username(actor) {
      if (this.actorstousernames[actor]) {
        return this.actorstousernames[actor];
      } else {
        return 'anonUser'
      }
    }

  }
}

const Group = {
  props: ["actorstousernames", "classid", "currgroup", "addallowed", "seeingparticipants", 
  "removeallowed", "delpar", "editablename", "initial"],
  template: '#group',

  setup(props) {
    const $gf = Vue.inject('graffiti')
    //const classid = Vue.toRef(props, 'classid')
    //const { objects: groupsRaw } = $gf.useObjects([classid])
    const { objects: groupsRaw } = $gf.useObjects(['test'])
    const { objects: leavesRaw } = $gf.useObjects([$gf.me]);
    return { groupsRaw, leavesRaw }
  },

  created() {
    this.resolver = new Resolver(this.$gf)
  },

  data() {
    // Initialize some more reactive variables
    return {
      name: '',
      creatingGroup: false,
      currParticipant: '',
      participants: [this.$gf.me],
      displayError: false,
      addingParticipant: false,
      editingName: false,
    }
  },

  computed: {
    groups() {
      let groups = this.groupsRaw.filter(
        ( group =>
          // Does the message have a type property?
          group.type         &&
          // Is the value of that property 'Note'?
          group.type== 'Group' 
          &&
          // Does the message have a content property?
          group.participants      &&
          // Is that property a string?
          group.participants.includes(this.$gf.me)
          ) 
        // Your filtering here
      )

      let leaves = this.leavesRaw.filter(
        ( leave =>
          // Does the message have a type property?
          leave.type         &&
          // Is the value of that property 'Note'?
          leave.type == 'Leave' 
          // &&
          // // Does the message have a content property?
          // leave.object      &&
          // // Is that property a string?
          // leave.object.id.includes(this.$gf.me.slice(13))
          ) 
        // Your filtering here
      )

      for (const group of groups) {
        for (const leave of leaves) {
          
          if (leave.object.id == group.id) {
            let indx;

            for (let i = 0; i < group.participants.length; i++) {
              if (group.participants[i] === leave.actor) {
                indx = i;
              }
            }
            if (indx) {
              group.participants.splice(indx, 1);
            }
          }
        }
      }
      return groups;
    },
  },
  methods: {
    async addParticipant() {

      if (this.currParticipant !== '') {
        let particpantId;

        for (const actor of Object.keys(this.actorstousernames)) {
          if (this.actorstousernames[actor] === this.currParticipant) {
            particpantId = actor;
          }
        }
  
        if (!particpantId) {
          particpantId = await this.resolver.usernameToActor(this.currParticipant);
          this.actorstousernames[particpantId] = this.currParticipant;
        }
  
        if (particpantId) {
          if (!this.participants.includes(particpantId)) {
            this.participants.push(particpantId);
          }
        } else {
          this.displayError = true;
        }

      } else {
        this.displayError = true;
      }

    },
    removeParticipant(indx) {
      this.participants.splice(indx,1);
    },
    removeExistingParticipant() {

      let currGroupObject;

      for (const group of this.groups) {
        if (group.id == this.currgroup.id) {
          currGroupObject = group;
        }
      }

      let indx;
      for (let i = 0; i < this.currgroup.participants.length; i++) {
        if (this.currgroup.participants[i] === this.delpar) {
          indx = i;
        }
      }

      currGroupObject.participants.splice(indx,1);
      this.currgroup.participants = currGroupObject.participants;
    },
    leaveGroup() {
      let currGroupObject;
      for (const group of this.groups) {
        if (group.id == this.currgroup.id) {
          currGroupObject = group;
        }
      }

      const leaveRequest = {
        type: 'Leave',
        summary: this.actorstousernames[this.$gf.me]? this.actorstousernames[this.$gf.me] : this.$gf.me + ' wants to leave group ' + currGroupObject.name,
        // context: this.classid,
        context: [currGroupObject.actor],
        object: currGroupObject,
      }

      this.$gf.post(leaveRequest);
      // for (let i = 0; i < currGroupObject.participants.length; i++) {
      //   if (currGroupObject.participants[i] === this.$gf.me) {
      //     currGroupObject.participants.splice(i,1);
      //   }
      // }

    },
    async addNewParticipant() {

      if (this.currParticipant !== '') {
        let particpantId;
        let currGroupObject;

        for (const group of this.groups) {
          if (group.id == this.currgroup.id) {
            currGroupObject = group;
          }
        }
        for (const actor of Object.keys(this.actorstousernames)) {
          if (this.actorstousernames[actor] === this.currParticipant) {
            particpantId = actor;
          }
        }
        if (!particpantId) {
          particpantId = await this.resolver.usernameToActor(this.currParticipant);
          this.actorstousernames[particpantId] = this.currParticipant;
        }
        if (particpantId) {
          if (!currGroupObject.participants.includes(particpantId)) {
            currGroupObject.participants.push(particpantId);
            this.addingParticipant = false;
          }
        } else {
          this.displayError = true;
        }
        this.currgroup.participants = currGroupObject.participants;
      } else {
        this.displayError = true;
      }
    },
    changeGroupName() {
      let currGroupObject;
      for (const group of this.groups) {
        if (group.id == this.currgroup.id) {
          currGroupObject = group;
        }
      }
      currGroupObject.name = this.name;
      this.currgroup.name = currGroupObject.name;
      this.editingName = false;
    },
    deleteGroup() {
      let currGroupObject;
      for (const group of this.groups) {
        if (group.id == this.currgroup.id) {
          currGroupObject = group;
        }
      }
      this.$gf.remove(currGroupObject);
      this.seeingparticipants.value = false;

      window.location.reload();
      
    },
    createGroup() {
      const group = {
        type: 'Group',
        name: this.name,
        // context: this.classid,
        context: ['test'],
        participants: this.participants,
      }
      this.$gf.post(group);
      this.creatingGroup = false;
      this.updateGroup(group.id, group.name, group.participants);
    },
    updateGroup(id, name, participants) {
      this.currgroup.id = id;
      this.currgroup.name = name;
      this.currgroup.participants = participants;
    }
  }
}

app.components = { Profile, Name, Like, Read, Reply, Group }
Vue.createApp(app)
   .use(GraffitiPlugin(Vue))
   .mount('#app')
