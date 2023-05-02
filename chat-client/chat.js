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
    const privateMessaging = Vue.ref(false)

    // If we're private messaging use "me" as the channel,
    // otherwise use the channel value
    const $gf = Vue.inject('graffiti')
    const context = Vue.computed(()=> privateMessaging.value? [$gf.me] : [channel.value])

    // Initialize the collection of messages associated with the context
    const { objects: messagesRaw } = $gf.useObjects(context)

    //const { objects: allMessagesRaw } = $gf.useObjects()
    return { channel, privateMessaging, messagesRaw }
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
      messageUsernames: [],
      notifyBad: false,
      badUsername: false,
      file: null,
      downloadedImages: {}
    }
  },
  // watch: {
  //   async usernameRecipient() {
  //     console.log('here');
  //     this.recepient = await this.resolver.usernameToActor(this.usernameRecipient);
  //     console.log(this.recepient);    
  //     messages();
  //   }
  // },

  watch: {
    async messages(messages) {
      let imgMessages = messages.filter(m=>
        m.attachment && m.attachment.type == "Image"
        && typeof m.attachment.magnet == "string"
      );
      for (const imgMessage of imgMessages) {
        if (!this.downloadedImages[imgMessage.attachment.magnet]) {
          const imgURI = await this.$gf.media.fetch(imgMessage.attachment.magnet);
          const url = URL.createObjectURL(imgURI);
          this.downloadedImages[imgMessage.attachment.magnet] = url;
        }
      }
      console.log(this.downloadedImages);
    }
  },

  computed: {
    messages() {
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


          // const userIds = [];

          // for (const message of messages) {
          //   for (const user of message.bto) {

          //   }
          //     if (message.bto[0] !== this.$gf.me && !privChats.includes(message.bto[0]))  {
          //       userIds.push(message.bto[0]);
          //     }
      
          //     if (message.actor !== this.$gf.me && !privChats.includes(message.actor))  {
          //       userIds.push(message.actor);
          //     }
          //   }
          // }

      // Do some more filtering for private messaging
      if (this.privateMessaging) {

        const privChats = [];
        const seen = [];

        const single =  messages.filter(m=>
          // Is the message private?
          m.bto &&
          // Is the message to exactly one person?
          m.bto.length == 1)


        for (const message of single) {
          if  (message.bto && message.bto.length === 1) {
            if (message.bto[0] !== this.$gf.me && !seen.includes(message.bto[0]))  {
              privChats.push([message.bto[0],'']);
              seen.push(message.bto[0]);
            }
    
            if (message.actor !== this.$gf.me && !seen.includes(message.actor))  {
              privChats.push([message.actor,'']);
              seen.push(message.actor);
            }
          }
        }

        this.privChats = privChats;
        console.log(this.privChats[0]);

        messages = messages.filter(m=>
          // Is the message private?
          m.bto &&
          // Is the message to exactly one person?
          m.bto.length == 1 &&
          (
            // Is the message to the recipient?
            m.bto[0] == this.recepient ||
            // Or is the message from the recipient?
            m.actor == this.recepient
          ))
      }
      return messages
        // Sort the messages with the
        // most recently created ones first
        .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
        // Only show the 10 most recent ones
        .slice(0,10)
    },
  },

  methods: {

    getUsernames() {
      console.log('aca');
      const classes = document.getElementsByClassName(".msgUsername");
      for (let i = 0; i < this.message.length; i++) {
        this.resolver.usernameToActor(this.message[i].actor).then((username) => classes[i].innerHTML = username)
      }
    },

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
      console.log('aca');
      this.usernameRecipient = id;
      this.newChat = true;
      await this.updateRecipient();
      console.log(this.recipient);
    },

    startNewChat() {
      this.usernameRecipient = '';
      this.newChat = true;
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

        if (this.privateMessaging) {
          messages = await messages.filter(async m=>
            // Is the message private?
            m.bto &&
            // Is the message to exactly one person?
            m.bto.length == 1 &&
            (
              // Is the message to the recipient?
              m.bto[0] == await this.resolver.usernameToActor(this.usernameRecipient) ||
              // Or is the message from the recipient?
              m.actor == await this.resolver.usernameToActor(this.usernameRecipient)
            ))
        }
        messages = messages
          // Sort the messages with the
          // most recently created ones first
          .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
          // Only show the 10 most recent ones
          .slice(0,10)

        this.messages = messages;
    },
    
    async updateRecipient() {
      console.log('aca');

      const user = await this.resolver.usernameToActor(this.usernameRecipient);

      if (user) {
        this.recepient = user; 
        this.notifyBad = false;
      } else {
        if (this.usernameRecipient !== '') {
          this.notifyBad = true;
        }
        this.recepient = ''; 
      }

      console.log(this.recipient);
       
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
        if (!channel.includes('graffitiactor://') && channel !== "designftw.mit.edu" && channel !== "default") {
          userPublicChannels.push(channel);
        }
      }
      this.userChannels = userPublicChannels;
    },


    async getPrivateChats() {
      const userChats = [];

      for (const actor of this.privChats) {
        userChats.push([actor[0], await this.resolver.actorToUsername(actor[0])]); 
      }

      this.privUsers = userChats;
      console.log(this.privChats[0]);

      // console.log(userChats);
      // console.log(this.privChats);
      // const privChats = [];

      // for (const message of this.messages) {
      //   if (message.bto[0] !== this.$gf.me && !privChats.includes(message.bto[0]))  {
      //     privChats.push(message.bto[0]);
      //   }

      //   if (message.actor !== this.$gf.me && !privChats.includes(message.actor))  {
      //     privChats.push(message.actor);
      //   }
      // }

      // console.log(privChats);
    },

    async getPrivateMessages() {
      // Do some more filtering for private messaging
      const messages = await this.messages.filter(async m=>
        // Is the message private?
        m.bto &&
        // Is the message to exactly one person?
        m.bto.length == 1 &&
        (
          // Is the message to the recipient?
          m.bto[0] == this.usernameRecipient ||
          // Or is the message from the recipient?
          m.actor == this.usernameRecipient
        ))

      //messages.sort((m1, m2)=> new Date(m2.published) - new Date(m1.published)).slice(0,10);
    },

    async privMessages() {
      let messages;
      if (this.privateMessaging) {
        messages = await this.getPrivateMessages();
      }
      return messages;
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
      if (this.privateMessaging) {
        message.bto = [this.recepient]
        message.context = [this.$gf.me, this.recepient]
      } else {
        message.context = [this.channel]
      }

      if (this.file) {
        const fileURI = await this.$gf.media.store(this.file);

        message.attachment = {};
        message.attachment.type = "Image";
        message.attachment.magnet = fileURI;
        this.file = null;
      }

      // Send!
      this.$gf.post(message)
    },

    removeMessage(message) {
      this.$gf.remove(message)
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
      } catch (e) {
        this.badUsername = true;
      }
      
    }
  }
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

app.components = { Name }
Vue.createApp(app)
   .use(GraffitiPlugin(Vue))
   .mount('#app')
