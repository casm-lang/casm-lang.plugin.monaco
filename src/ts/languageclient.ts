//
//  Copyright (c) 2017 CASM Organization
//  All rights reserved.
//
//  Developed by: Philipp Paulweber
//                https://github.com/casm-lang/casm-lang.plugin.monaco
//
//  This file is part of casm-lang.plugin.monaco.
//
//  casm-lang.plugin.monaco is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  casm-lang.plugin.monaco is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with casm-lang.plugin.monaco. If not, see <http://www.gnu.org/licenses/>.
//
//
//  Copyright (c) 2017 TypeFox GmbH (http://www.typefox.io). All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//
//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
//

import
{ listen
, MessageConnection
}
from 'vscode-ws-jsonrpc';

import
{ BaseLanguageClient
, CloseAction
, ErrorAction
, createMonacoServices
, createConnection
}
from 'monaco-languageclient';

import IMonarchLanguage = monaco.languages.IMonarchLanguage;

const ReconnectingWebSocket = require( 'reconnecting-websocket' );

const value = `
// Hello World Example Specification
CASM

init hello_world /* single execution agent definition  */

function f : Integer -> Integer

/**
    docu for this hello world rule ;-)
*/
rule hello_world =
{
    println( "Hello world!" ) // 'println' is a built-in!

    let x = true in
        assert( x )

    forall i in [-10..10] do
        f(i) := i * i

    program( self ) := undef
}

`;

monaco.languages.register
( { id: 'casm'
  , extensions: [ '.casm' ]
  , aliases: [ 'CASM', 'casm' ]
  , mimetypes: [ 'text/plain' ]
  }
);

var w = <any>window;

w.model = monaco.editor.createModel
( value
, 'casm'
, monaco.Uri.parse( 'inmemory://model.casm' )
);

// https://microsoft.github.io/monaco-editor/monarch.html#htmlembed

monaco.editor.defineTheme
( 'casm'
  , { base: 'vs'
      , inherit: true
      , rules:
      [ { token: 'keyword', foreground: '0033ff', fontStyle: 'bold' }
      , { token: 'type', foreground: 'aa0000', fontStyle: '' }
      , { token: 'predefined', foreground: '9900ff', fontStyle: '' }
      , { token: 'operators', foreground: '000000', fontStyle: 'bold' }
      , { token: 'constant', foreground: '0099ff', fontStyle: 'bold' }
      , { token: 'number', foreground: '000000', fontStyle: 'bold' }
      , { token: 'string', foreground: '000000', fontStyle: '' }
      , { token: 'comment', foreground: '006600', fontStyle: '' }
      , { token: 'comment.doc', foreground: '006600', fontStyle: 'bold' }
      ]
  }
);

w.editor = monaco.editor.create
( document.getElementById( "container" )!
  , { model: w.model
      , scrollBeyondLastLine: false
      , roundedSelection: true
      , lineNumbers: "on"
      , theme: "casm"
      // , theme: "vs-dark"
      //, fontSize: 12
      //, fontFamily: "font name etc."
  }
);



function createUrl( path: string ): string
{
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';

    var casmd = w.casmd;
    if( typeof casmd !== 'undefined' && casmd !== null )
    {
        var flag = casmd.standalone;
        if( typeof flag !== 'undefined' && flag !== null && flag == true )
        {
            return `${protocol}://127.0.0.1:8010`;
        }
    }

    return `${protocol}://${location.host}${path}`;
}

function createWebSocket( url: string ): WebSocket
{
    const socketOptions =
    { maxReconnectionDelay: 5000
    , minReconnectionDelay: 1000
    , reconnectionDelayGrowFactor: 1.3
    , connectionTimeout: 5000
    , maxRetries: Infinity
    , debug: false
    };

    return new ReconnectingWebSocket
    ( url
    , [ "binary" ]
    , socketOptions
    );
}


const url = createUrl( '/casmd' );

const webSocket = createWebSocket( url );

// flag = false;

listen
( { webSocket
  , onConnection: connection =>
    {
        const languageClient = createLanguageClient( connection );
        const disposable = languageClient.start();
        connection.onClose( () =>
        {
	        // flag = false;
	        disposable.dispose();
	    });


        var language = <IMonarchLanguage>
            { defaultToken: 'invalid'
            , tokenPostfix: '.casm'

            , brackets: [
                { token: 'delimiter.curly', open: '{', close: '}' },
                { token: 'delimiter.curly', open: '{|', close: '|}' },
                { token: 'delimiter.parenthesis', open: '(', close: ')' },
                { token: 'delimiter.square', open: '[', close: ']' },
                { token: 'delimiter.angle', open: '<', close: '>' }
            ]

            , keywords: [
                'CASM',
                'init',
                'function',
                'initially',
                'defined',
                'derived',
                'enum',
                'type',
                'rule',
                'skip',
                'let',
                'in',
                'case',
                'of',
                'default',
                '_',
                'if',
                'then',
                'else',
                'par',
                'endpar',
                'seq',
                'endseq',
                'self',
                'result',
                'iterate',
                'forall',
                'do',
                'holds',
                'exists',
                'with',
                'call',
                'choose',
            ]

            , constants:
              [ 'self'
              , 'undef'
              , 'false'
              , 'true'
              ]

            , builtins:
              [ 'assert'
              , 'print'
              , 'println'
              , 'asBoolean'
              , 'asInteger'
              , 'asBit'
              , 'asString'
              , 'asRational'
              , 'asFloating'
              , 'dec'
              , 'hex'
              , 'bin'
              , 'oct'
              ]

            , types:
              [ 'Void'
              , 'Boolean'
              , 'Integer'
              , 'Bit'
              , 'String'
              , 'Floating'
              , 'Rational'
              ]

            , functions:
              [ 'program'
              ]

            , operators:
              [ ':='
              , '>'
              , '<'
              , '='
              , '!='
              , '<='
              , '>='
              , 'not'
              , 'and'
              , 'or'
              , 'xor'
              , '+'
              , '-'
              , '*'
              , '%'
              , '/'
              , '^'
              , 'inverse'
              , 'implies'
              , '..'
              ]

            // we include these common regular expressions
            , symbols:  /[=><!~?:&|+\-*\/\^%]+/,
            escapes:  /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
            integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
            floatsuffix: /[fFlL]?/,

            // The main tokenizer for our languages
            tokenizer: {
                root: [
                    // identifiers and keywords
                    [/[a-zA-Z_]\w*/
                     , { cases:
                         { '@keywords': {token:'keyword.$0'}
                           , '@constants': 'constant'
                           , '@builtins': 'predefined'
                           , '@types': 'type'
                           , '@functions': 'entity'
                           , '@default': 'identifier'
                         }
                       }
                    ],

                    // whitespace
                    { include: '@whitespace' },

                    // [[ attributes ]].
                    [/\[\[.*\]\]/, 'annotation'],

                    // Preprocessor directive
                    [/^\s*#\w+/, 'keyword'],

                    // delimiters and operators
                    [/[{}()\[\]]/, '@brackets'],
                    [/[<>](?!@symbols)/, '@brackets'],
                    [/@symbols/, { cases: { '@operators': 'delimiter',
                                            '@default'  : '' } } ],

                    // numbers
                    [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                    [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                    [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
                    [/0[0-7']*[0-7](@integersuffix)/, 'number.octal'],
                    [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
                    [/\d[\d']*\d(@integersuffix)/, 'number'],
                    [/\d(@integersuffix)/, 'number'],

                    // delimiter: after number because of .\d floats
                    [/[;,.]/, 'delimiter'],

                    // strings
                    [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
                    [/"/,  'string', '@string' ],

                    // characters
                    [/'[^\\']'/, 'string'],
                    [/(')(@escapes)(')/, ['string','string.escape','string']],
                    [/'/, 'string.invalid']
                ],

                whitespace: [
                    [/[ \t\r\n]+/, ''],
                    [/\/\*\*(?!\/)/,  'comment.doc', '@doccomment' ],
                    [/\/\*/,       'comment', '@comment' ],
                    [/\/\/.*$/,    'comment'],
                ],

                comment: [
                    [/[^\/*]+/, 'comment' ],
                    [/\*\//,    'comment', '@pop'  ],
                    [/[\/*]/,   'comment' ]
                ],
                //Identical copy of comment above, except for the addition of .doc
                doccomment: [
                    [/[^\/*]+/, 'comment.doc' ],
                    [/\*\//,    'comment.doc', '@pop'  ],
                    [/[\/*]/,   'comment.doc' ]
                ],

                string: [
                    [/[^\\"]+/,  'string'],
                    [/@escapes/, 'string.escape'],
                    [/\\./,      'string.escape.invalid'],
                    [/"/,        'string', '@pop' ]
                ],
            },
        };


// const syntax = `
// PPA: add config here
// `;

        // var def = null;
        try
        {
            // def = eval( "(function(){ return " + syntax + "; })()" );
            // monaco.languages.setMonarchTokensProvider( 'casm', def );
            monaco.languages.setMonarchTokensProvider( 'casm', language );
        }
        catch (err)
        {
            console.error( "could not set CASM language model" );
            console.error( err );
            return;
        }

	    // flag = true;

	    // w.editor.addAction
	    // ( { id: 'casmd-version'
	    //     , label: 'Display version information of casmd'
	    //     , keybindings: [ monaco.KeyMod.CtrlCmd, monaco.KeyCode.F4 ]
	    //     , keybindingContext: null
	    //     , contextMenuGroupId: 'navigation'
	    //     , contextMenuOrder: 1.5
	    //     , run: () => {
	    // 	console.log("CASMd");
	    // 	if( flag )
	    // 	{
	    // 	    webSocket.send( "CASMd" );
	    // 	}
	    // 	return null;
	    //     }
	    //   }
	    // );

	    // webSocket.addEventListener('message', function(e: any) { // : void => {
	    //     // flags.binary will be set if a binary data is received.
	    //     // flags.masked will be set if the data was masked.
	    //     // ws.binaryType = 'arraybuffer';
	    //     // ws.send('i am ready to receive some data!');
	    //     console.log( e.data );
	    // });
    }
});

const services = createMonacoServices();

function createLanguageClient( connection: MessageConnection ): BaseLanguageClient
{
    return new BaseLanguageClient
    ( { name: "casm-lang.plugin.monaco"
      , clientOptions:
      { documentSelector: [ 'casm' ]
        , errorHandler:
        { error: () => ErrorAction.Continue
        , closed: () => CloseAction.DoNotRestart
        }
      }
      , services
      , connectionProvider:
        { get: (errorHandler, closeHandler) =>
          {
	          return Promise.resolve
              ( createConnection
                ( connection
                , errorHandler
                , closeHandler
                )
              );
          }
        }
      }
    );
}

//
//  Local variables:
//  mode: javascript
//  indent-tabs-mode: nil
//  c-basic-offset: 4
//  tab-width: 4
//  End:
//  vim:noexpandtab:sw=4:ts=4:
//
