export type Channel = {
  sendMessage: (message: any) => Promise<void>;
  onMessage: () => Promise<any>;
};

export function createBaseChannel(): Channel {
  let messageQueue: any[] = [];
  let resolveQueue: any[] = [];

  return {
      sendMessage: (message: any) => {
          return new Promise((resolve, reject) => {
              if (resolveQueue.length > 0) {
                  const resolve = resolveQueue.shift();
                  resolve(message);
              } else {
                  messageQueue.push(message);
              }
              resolve();
          });
      },

      onMessage: () => {
          return new Promise((resolve, reject) => {
              if (messageQueue.length > 0) {
                  const message = messageQueue.shift();
                  resolve(message);
              } else {
                  resolveQueue.push(resolve);
              }
          });
      }
  };
}

export function createMulticastChannel(): Channel {
    let baseChannel = createBaseChannel();
    let resolveQueue: any[] = [];

    return {
        ...baseChannel,
        sendMessage: (message: any) => {
            return new Promise((resolve, reject) => {
                while (resolveQueue.length > 0) {
                    const resolve = resolveQueue.shift();
                    resolve(message);
                }
                baseChannel.sendMessage(message);
                resolve();
            });
        },
        onMessage: () => {
            return new Promise((resolve, reject) => {
                baseChannel.onMessage().then(message => {
                    if (message) {
                        resolve(message);
                    } else {
                        resolveQueue.push(resolve);
                    }
                });
            });
        }
    };
  }


export function createMessagingChannel(port: MessagePort): Channel {
  let baseChannel = createBaseChannel();

  return {
      ...baseChannel,
      sendMessage: (message: any) => {
          return new Promise((resolve, reject) => {
              port.postMessage(message);
              resolve();
          });
      },

      onMessage: () => {
          return new Promise((resolve, reject) => {
              port.onmessage = (event: MessageEvent) => resolve(event.data);
          });
      }
  };
}

export type ChannelOptions = {
  type: 'base' | 'broadcast' | 'messaging';
  port?: MessagePort;
};

export function createChannel(options: ChannelOptions): Channel {
  switch (options.type) {
      case 'base':
          return createBaseChannel();
      case 'broadcast':
          return createMulticastChannel();
      case 'messaging':
          if (!options || !options.port) {
              throw new Error('A port must be provided to create a messaging channel');
          }
          return createMessagingChannel(options.port);
      default:
          throw new Error(`Invalid channel type: ${options.type}`);
  }
}
