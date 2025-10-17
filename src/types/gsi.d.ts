declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: { 
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
            [key: string]: any;
          }) => {
            requestAccessToken: (options: { prompt?: string }) => void;
          };
        };
      };
      tokenClient: {
        requestAccessToken: (options: { prompt?: string }) => void;
      };
    };
  }
}
declare global {
  namespace gapi {
    namespace client {
      function init(config: any): Promise<any>;
      function load(name: string, version: string, callback: () => void): void;
      function setToken(token: any): void;
      function request(request: any): Promise<any>;
    }
  }
  interface Window {
    gapi: typeof gapi;
  }
}

export {};