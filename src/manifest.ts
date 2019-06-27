import * as Path from 'path'
import { readfile, stat } from './fs'
import { jsonparse } from './util'
import { join as pjoin } from 'path'

export interface ManifestProps extends Figma.ManifestJson {
  ui? :string
    // ui is an alternative to the html property.
    // It is automatically set to the value of "html" if "html" property is
    // present.
}

// props of Figma.ManifestJson
const standardProps = new Set([
  "version",
  "name",
  "script",
  "html",
  "menu",
  "build",
])

// props required by Figma.ManifestJson
const requiredProps = [
  "name",
  "version",
  "script",
]

// type union of possible values of figma manifest
type StdManifestValue = string | Figma.ManifestMenuItem[]

// TODO: whenever the figma api divergest from the above, introduce versioning
// on the props lists. Use the "version" information in the manifest to
// select which data to care about.

// TODO: consider preprocessing the TypeScript definitions to automatically
// generate the data above.


export class Manifest {
  readonly file: string
  readonly props: ManifestProps

  constructor(file :string, props: ManifestProps) {
    this.file = file
    this.props = props
  }

  // returns a copy of props containing only Figma-standard properties
  //
  getStandardProps() :Figma.ManifestJson {
    let props = {} as Figma.ManifestJson
    for (let k in this.props) {
      if (standardProps.has(k)) {
        (props as any)[k] = (this.props as any)[k]
      }
    }
    return props
  }

  // returns a map of Figma-standard properties in a predefined,
  // well-known order.
  //
  getStandardPropMap() :Map<string,StdManifestValue> {
    let m = new Map<string,StdManifestValue>()
    for (let k in this.props) {
      if (standardProps.has(k)) {
        m.set(k, (this.props as any)[k])
      }
    }
    return m
  }

  // load a manifest file at path which can name a file or a directory.
  //
  static async load(path :string) :Promise<Manifest> {
    if (path.endsWith(".json") || path.endsWith(".js")) {
      return Manifest.loadFile(Path.resolve(path))
    } else if (path.endsWith(Path.sep)) { // e.g. foo/bar/
      return Manifest.loadDir(Path.resolve(path))
    }
    path = Path.resolve(path)
    if ((await stat(path)).isDirectory()) {
      return Manifest.loadDir(path)
    }
    return Manifest.loadFile(path)
  }

  // loadDir loads some manifest file in a directory
  //
  static loadDir(dir :string) :Promise<Manifest> {
    return Manifest.loadFile(pjoin(dir, "manifest.json")).catch(e => {
      if (e.code == 'ENOENT') {
        return Manifest.loadFile(pjoin(dir, "manifest.js"))
      }
      throw e
    })
  }

  // loadFile loads a manifest file
  //
  static async loadFile(file :string) :Promise<Manifest> {
    let props = jsonparse(await readfile(file, 'utf8'), file) as ManifestProps

    // verify that required properties are present
    for (let prop of requiredProps) {
      if ((props as any)[prop] === undefined) {
        throw new Error(`missing ${repr(prop)} property in ${file}`)
      }
    }

    // alias html <-> ui
    props.ui = props.ui || props.html
    props.html = props.html || props.ui

    return new Manifest(file, props)
  }
}


// const internalManifestProps = new Set([
//   'manifestFile',
// ])

// // manifestToFigmaManifest returns a Figma.ManifestJson without
// // figplug properties.
// //
// export function manifestToFigmaManifest(m :Manifest) :Figma.ManifestJson {
//   let fm :{[k:string]:any} = {}
//   for (let k of Object.keys(m)) {
//     if (!internalManifestProps.has(k)) {
//       fm[k] = (m as any)[k]
//     }
//   }
//   return fm as Figma.ManifestJson
// }