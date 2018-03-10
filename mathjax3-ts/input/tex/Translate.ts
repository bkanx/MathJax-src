/*************************************************************
 *
 *  MathJax/jax/input/TeX/Translate.js
 *
 *  Implements the TeX InputJax that reads mathematics in
 *  TeX and LaTeX format and converts it to the MML ElementJax
 *  internal format.
 *
 *  ---------------------------------------------------------------------
 *
 *  Copyright (c) 2009-2017 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {TreeHelper} from './TreeHelper.js';
import TexParser from './TexParser.js';
import {ParserUtil} from './ParserUtil.js';
import TexError from './TexError.js';
import {MmlNode} from '../../core/MmlTree/MmlNode.js';
import {MmlMo} from '../../core/MmlTree/MmlNodes/mo.js';
import {OperatorDef, RangeDef} from '../../core/MmlTree/OperatorDictionary.js';

// A wrapper for translating scripts with LaTeX content.

export namespace NewTex {

  export type Script = {type: string, innerText: string, MathJax: any};

  export let display: boolean = false;

  export function Compile(tex: string, display: boolean): MmlNode {
    let script = {
      type: 'math/tex' + (display ? '; mode=display' : ''),
      innerText: tex,
      MathJax: {}
    };
    let node = Translate(script, [], {});
    (node as any).setInheritedAttributes();
    (node as any).setTeXclass();
    return node;
  }

  let formatError = function (err: TexError, math: string, display: boolean, script: Script) {
    let message = err.message.replace(/\n.*/, '');
    return TreeHelper.createError(message);
  };

  export function Translate(
    script: Script, configurations: string[] = [], stackitem?: any): MmlNode {
      TreeHelper.printMethod('Translate');
      TreeHelper.printSimple(script.toString());
      let mml: MmlNode;
      let parser: TexParser;
      let isError = false;
      let math = script.innerText;
      display = script.type.replace(/\n/g, ' ').
        match(/(;|\s|\n)mode\s*=\s*display(;|\s|\n|$)/) != null;
      try {
        parser = new TexParser(math, null);
        mml = parser.mml();
        TreeHelper.printSimple(mml.toString());
      } catch (err) {
        if (!(err instanceof TexError)) {
          throw err;
        }
        mml = formatError(err, math, display, script);
        isError = true;
      }
      mml = TreeHelper.cleanSubSup(mml);
      if (TreeHelper.isType(mml, 'mtable') &&
          TreeHelper.getAttribute(mml, 'displaystyle') === 'inherit') {
        // for tagged equations
        TreeHelper.untested('Tagged equations');
        TreeHelper.setAttribute(mml, 'displaystyle', display);
      }
      let mathNode = TreeHelper.createMath(mml);
      let root = TreeHelper.getRoot(mathNode);
      if (display) {
        TreeHelper.setAttribute(root, 'display', 'block');
      }
    (mathNode as any).setInheritedAttributes();
    (mathNode as any).setTeXclass();
    if (!parser) {
      // In case we have a caught error, parser will be undefined.
      return mathNode;
    }
    for (let mo of parser.secondPass) {
      let forms = mo.getForms();
      let symbol: OperatorDef;
      // Probably not needed!
      let range: RangeDef = null;
      for (let form of forms) {
        symbol = MmlMo.OPTABLE[form][mo.getText()];
        if (symbol) {
          break;
        }
      }
      if (symbol && symbol[3] && symbol[3]['stretchy']) {
        TreeHelper.setAttribute(mo, 'stretchy', false);
      }
      // if (!symbol) {
      //   range = mo.getRange(mo.getText());
      // }
      if (!TreeHelper.getTexClass(mo) && (!symbol || !symbol[2])) {
        const parent = mo.parent;
        const texAtom = TreeHelper.createNode('TeXAtom', [mo], {});
        texAtom.parent = parent;
        parent.childNodes = [texAtom];
      }
    }
      // TODO: Should not be necessary anymore!
      // if (isError) {
      //   (mathNode as any).texError = true;
      // }
      // ParserUtil.combineRelations(root);
      return mathNode;
    }
  
}
