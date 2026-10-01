import { mountPill, type PillTool } from './pill'
import registry from '../../../tools.json'

mountPill({ tools: registry.tools as PillTool[], pathname: location.pathname })
