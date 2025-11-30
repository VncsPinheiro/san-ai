type Message = {
  role: 'user' | 'model'
  parts: {
    text: string
  }[]
}


export type HistoryType = Message[]