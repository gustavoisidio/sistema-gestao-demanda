import { Fragment } from 'react'

/** Converte `**negrito**` em <b> (marcação mínima usada nos textos do laudo). */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}
