import{r as _,a as c,R as j}from"./index.BX2CdW4Z.js";var h={exports:{}},p={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var g;function y(){if(g)return p;g=1;var s=_(),r=Symbol.for("react.element"),n=Symbol.for("react.fragment"),i=Object.prototype.hasOwnProperty,x=s.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,m={key:!0,ref:!0,__self:!0,__source:!0};function l(o,t,b){var a,d={},u=null,v=null;b!==void 0&&(u=""+b),t.key!==void 0&&(u=""+t.key),t.ref!==void 0&&(v=t.ref);for(a in t)i.call(t,a)&&!m.hasOwnProperty(a)&&(d[a]=t[a]);if(o&&o.defaultProps)for(a in t=o.defaultProps,t)d[a]===void 0&&(d[a]=t[a]);return{$$typeof:r,type:o,key:u,ref:v,props:d,_owner:x.current}}return p.Fragment=n,p.jsx=l,p.jsxs=l,p}var w;function R(){return w||(w=1,h.exports=y()),h.exports}var e=R();const f=s=>{let r=`${Math.floor(Math.random()*2e3)}px ${Math.floor(Math.random()*2e3)}px #FFF`;for(let n=2;n<=s;n++)r+=`, ${Math.floor(Math.random()*2e3)}px ${Math.floor(Math.random()*2e3)}px #FFF`;return r};function N({title:s=`LINK
VAULT`,children:r,className:n="",speed:i=1}){const x=c.useMemo(()=>f(700),[]),m=c.useMemo(()=>f(200),[]),l=c.useMemo(()=>f(100),[]);return e.jsxs("div",{className:`relative w-full h-screen overflow-hidden bg-space-deepest font-sans ${n}`,children:[e.jsx("style",{children:`
        .bg-radial-space {
          background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
        }
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
      `}),e.jsx("div",{className:"absolute inset-0 bg-radial-space z-0"}),e.jsx("div",{className:"absolute left-0 top-0 w-[1px] h-[1px] bg-transparent z-10",style:{boxShadow:x,animation:`animStar ${50/i}s linear infinite`},children:e.jsx("div",{className:"absolute top-[2000px] w-[1px] h-[1px] bg-transparent",style:{boxShadow:x}})}),e.jsx("div",{className:"absolute left-0 top-0 w-[2px] h-[2px] bg-transparent z-10",style:{boxShadow:m,animation:`animStar ${100/i}s linear infinite`},children:e.jsx("div",{className:"absolute top-[2000px] w-[2px] h-[2px] bg-transparent",style:{boxShadow:m}})}),e.jsx("div",{className:"absolute left-0 top-0 w-[3px] h-[3px] bg-transparent z-10",style:{boxShadow:l,animation:`animStar ${150/i}s linear infinite`},children:e.jsx("div",{className:"absolute top-[2000px] w-[3px] h-[3px] bg-transparent",style:{boxShadow:l}})}),e.jsxs("div",{className:"absolute top-1/2 left-0 right-0 -mt-[60px] text-center z-20 px-4",children:[e.jsx("h1",{className:"font-light text-[30px] md:text-[50px] tracking-[10px] leading-tight",children:s.split(`
`).map((o,t)=>e.jsxs(j.Fragment,{children:[e.jsx("span",{className:"text-gradient-space",children:o}),t<s.split(`
`).length-1&&e.jsx("br",{})]},t))}),r&&e.jsx("div",{className:"mt-8",children:r})]})]})}export{N as ParallaxStarsBackground};
