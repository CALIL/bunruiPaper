// @flow
/*

 Unitrad UI Book

 Copyright (c) 2020 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php

 */

import React from 'react';
import {api} from '../api.js'
import {processExcludes, unresolvedHoldings, countHoldings, intersectHoldings} from '../sort.js'

type State = {
  uuid: ?string,
  book_deep: ?UnitradBook,
  unresolvedHoldings: Array<number>
};

type Props = {
  uuid: string,
  book: UnitradBook,
  opened: boolean,
  index: number,
  includes: Array<number>,
  excludes: Array<number>,
  region: string,
  onSelect: Function,
  onClose: Function,
  name_to_id: { [string]: Array<number> },
  libraries: { [number]: string },
  holdingOrder: ?Array<number>,
  customHoldingView: ?Function,
  holdingLinkReplacer: ?Function,
  remains: ?Array<string>
}

export default class Book extends React.Component<Props, State> {
  static defaultProps: Props;
  api: api;
  state = {
    uuid: null,
    book_deep: null,
    unresolvedHoldings: []
  };

  doDeepSearch() {
    if (this.props.opened && !this.api) {
      console.log('start deep search');
      this.api = new api({
        isbn: this.props.book.isbn,
        region: this.props.region
      }, this.doUpdate.bind(this));
    }
  }

  doUpdate(data: UnitradResult) {
    processExcludes(data.books, this.props.excludes);

    // 高精度化実験
    let book_deep;
    if (data.books.length >= 1) {
      if (!book_deep) {
        book_deep = {
          url: {},
          holdings: [],
          bid: {}
        };
      }
      data.books.map((book) => {
        book_deep.holdings = [...book_deep.holdings, ...book.holdings];
        for (let id in book.url) {
          if (book.url.hasOwnProperty(id)) {
            if (!book_deep.url.hasOwnProperty(id)) {
              book_deep.url[id] = book.url[id];
              book_deep.bid[id] = book.id;
            }
          }
        }
      })
    } else {
      book_deep = null;
    }

    this.setState({
      uuid: data.uuid,
      remains: data.remains,
      book_deep: book_deep, //(data.books.length >= 1) ? data.books[0] : null
      unresolvedHoldings: unresolvedHoldings(data, this.props.name_to_id)
    });
  }

  onKeyUp(e: SyntheticEvent<>) {
    e = e || window.event;
    if (e.keyCode === 13) {
      e.stopPropagation();
      this.props.onSelect(e);
    }
  }

  componentWillUnmount() {
    if (this.api) this.api.kill();
  }

  render() {
    /* 有効な所蔵情報を集約する
     * ・現在Deep検索中（またはエラー）で、推定所蔵データがあるものは追加
     * ・すべての確定所蔵は追加
     */
    let _holdings = this.props.book.holdings.concat();
    if (this.state.book_deep !== null) {
      _holdings = _holdings.concat(intersectHoldings(this.props.book.estimated_holdings, this.state.unresolvedHoldings), this.state.book_deep ? this.state.book_deep.holdings : []);
    } else if (this.props.book.estimated_holdings) {
      _holdings = _holdings.concat(this.props.book.estimated_holdings);
    }
    let virtual_holdings = _holdings.filter((x, i, self) => self.indexOf(x) === i);

    // 所蔵館数を計算する
    let hcount = countHoldings(virtual_holdings, this.props.includes);

    // 所蔵館数の例外処理（砺波市）
    if (this.props.includes.indexOf(104345) !== -1 && this.props.includes.indexOf(1104345) !== -1 && this.props.includes.indexOf(1104344) !== -1) {
      if (virtual_holdings.indexOf(104345) !== -1 && (virtual_holdings.indexOf(1104345) !== -1 || virtual_holdings.indexOf(1104344) !== -1)) {
        hcount -= 1;
      }
    }

    // 所蔵館数の例外処理（砺波市）
    if (this.props.includes.indexOf(2000000) !== -1) {
      hcount -= 1;
      if (virtual_holdings.indexOf(1104345) !== -1) hcount += 1;
      if (virtual_holdings.indexOf(1104344) !== -1) hcount += 1;
    }
    return (
      <div tabIndex="0" className={'row book ' + (this.props.opened ? 'opened' : '')}
           role="row"
           aria-expanded={this.props.opened}
           aria-rowindex={this.props.index}
           data-id={this.props.book.id}
           data-ndc={this.props.book.ndc}
           aria-label={
             (this.props.book.title + "。" +
               ((this.props.book.volume) ? this.props.book.volume + "。" : "") +
               ((this.props.book.author) ? "著者。" + this.props.book.author + "。" : "") +
               ((this.props.book.publisher) ? "出版者。" + this.props.book.publisher + "。" : "") +
               ((this.props.book.pubdate) ? "出版年。" + this.props.book.pubdate + "。" : "") +
               ((this.props.book.isbn === '' || this.props.book.isbn === null) ? '' : 'ISBNあり。'))}
           onKeyUp={!this.props.opened ? this.onKeyUp.bind(this) : null}
           onClick={!this.props.opened ? this.props.onSelect.bind(this) : null}>
        {(() => {
          /* 白河市のためのコード */
          /* || this.props.region === 'ishikawa' || this.props.region === 'gifu' ||this.props.region === 'aichi' || this.props.region === 'toyama' || this.props.region === 'fukui'  鯖江*/
　　　　　　/* this.props.region === 'tokyo' || this.props.region === 'chiba' */
          if ((this.props.region.startsWith('gk-')|| this.props.region === 'covid-cache' || this.props.region === 'sasebo' || this.props.region === 'kamisu' || this.props.region === 'shirakawa' || this.props.region === 'ichihara' || this.props.region === 'ujitawara') && this.props.book.isbn !== '' && this.props.book.isbn !== null && this.props.book.isbn !== '？' && this.props.book.isbn !== '(複数あり)') {
            return (
              <div className="cover">
                <img src={("https://asia-northeast1-libmuteki2.cloudfunctions.net/openbd_cover_with_google_books?isbn=" + (this.props.book.isbn ? this.props.book.isbn.replace(/-/g, "") : ''))} alt={this.props.book.title}/>
              </div>
            )
          }
        })()}
        <div className="title" role="gridcell">
          {this.props.book.title}
          <span className="volume">{this.props.book.volume}</span>
        </div>
        <div className="author" role="gridcell">{this.props.book.author}</div>
        <div className="publisher" role="gridcell">{this.props.book.publisher}</div>
        <div className="pubdate" role="gridcell">{this.props.book.pubdate}</div>
        <div className={'isbn' + (this.props.book.isbn !== '' && this.props.book.isbn !== null ? ' exist' : '')}
             role="gridcell">
          {(() => {
            if (this.props.isbnAdvanced && this.props.book._isbn.length >= 10 && (this.props.book._isbn.slice(0, 3) === '978' || this.props.book._isbn.slice(0, 3) === "\u2002\u2002\u2002")) {
              let block1 = this.props.book._isbn.slice(0, 3);
              let block2 = this.props.book._isbn.slice(3, 4);
              let block3 = this.props.book._isbn.slice(4);
              return (
                <span>
                  <span style={{
                    color: '#aaa',
                    paddingRight: '4px',
                    fontFamily: "Consolas, 'Courier New', Courier, Monaco, monospace"
                  }}>{block1}</span>
                  <span style={{
                    textDecoration: 'underline',
                    fontSize: '130%',
                    paddingRight: '2px',
                    fontWeight: block2 !== '4' ? 'bold' : 'normal',
                    fontFamily: "Consolas, 'Courier New', Courier, Monaco, monospace"
                  }}>{block2}</span>
                  <span style={{
                    fontSize: '120%',
                    letterSpacing: '1px',
                    fontFamily: "Consolas, 'Courier New', Courier, Monaco, monospace"
                  }}>{block3}</span>
                </span>
              )
            } else {
              return this.props.book.isbn
            }
          })()}
        </div>
        <div className="holdings" role="gridcell">
          {(() => {
            if (this.props.opened) {
              return (<button role="button" aria-label="閉じる" tabIndex="0" className="close" onClick={this.props.onClose.bind(this)}>&times;</button>)
            } else {
              if (hcount === 1) {
                let vid;
                if (this.props.includes.length === 0) {
                  vid = virtual_holdings[0];
                } else {
                  this.props.includes.forEach((id) => {
                    if (virtual_holdings.indexOf(id) !== -1) vid = id;
                  });
                }
                if (vid) {
                  return (<div className={'count labeled libid-' + vid}
                               data-label={vid in this.props.libraries ? this.props.libraries[vid] : vid}>{hcount}</div>)
                }
              } else {
                return (<div className={'count ' + ((hcount === 0) ? 'empty' : '')}>{hcount}</div>)
              }
            }
          })()}
        </div>
        {(() => {
          if (this.props.opened) {
            if (this.props.book.isbn !== '' && this.props.book.isbn !== '？' && this.props.book.isbn !== '(複数あり)' && !this.api) {
              // ISBNがある場合はAPIを呼び出す
              setTimeout(this.doDeepSearch.bind(this), 1000);
              this.deep_requested = true;
            }

            if (this.props.holdingOrder) {
              virtual_holdings.sort((a, b) => {
                let _a = this.props.holdingOrder ? this.props.holdingOrder.indexOf(a) : -1;
                if (_a === -1) _a = a;
                let _b = this.props.holdingOrder ? this.props.holdingOrder.indexOf(b) : -1;
                if (_b === -1) _b = b;
                if (_a < _b) return -1;
                if (_a > _b) return 1;
                return 0;
              });
            }else{
              virtual_holdings.sort(); // holdingOrderがない場合はID順とする
            }

            return (
              <div className="detail">
                <div className="count">
                  {hcount}館所蔵
                </div>
                {(() => {
                  if (this.props.customDetailView) {
                    let ref;
                    if (this.props.book.isbn === '' || this.props.book.isbn === null) {
                      if (virtual_holdings.length > 0) {
                        let holding = virtual_holdings[0];
                        if (this.props.book.url[holding]) {
                          ref = this.props.book.url[holding];
                        } else if (this.state.book_deep && this.state.book_deep.url[holding]) {
                          ref = this.state.book_deep.url[holding];
                        }
                      }
                    } else {
                      ref = window.location.href.split('?')[0] + '?isbn=' + this.props.book.isbn;
                    }
                    return (
                      <this.props.customDetailView url={ref}
                                                   uuid={this.props.uuid}
                                                   uuid_deep={this.state.uuid}
                                                   book={this.props.book}
                                                   region={this.props.region}
                                                   deep_book={this.state.book_deep}
                                                   libraries={this.props.libraries}
                                                   remains={this.deep_requested ? (this.state.remains ? this.state.remains : null) : this.props.remains}
                                                   holdings={virtual_holdings}/>);
                  }
                })()}
                <div className="links">
                  {virtual_holdings.map((holding) => {
                    if (this.props.includes.length === 0 || this.props.includes.indexOf(holding) !== -1) {
                      let url = undefined;
                      let uuid = undefined;
                      let bid = undefined;
                      if (this.props.book.url[holding]) {
                        url = this.props.book.url[holding];
                        uuid = this.props.uuid;
                        bid = this.props.book.id;
                      } else if (this.state.book_deep && this.state.book_deep.url[holding]) {
                        url = this.state.book_deep.url[holding];
                        bid = this.state.book_deep.bid[holding];
                        uuid = this.state.uuid;
                      }
                      if (url && this.props.holdingLinkReplacer) url = this.props.holdingLinkReplacer(url);

                      // 山口内部用
                      if (holding === 119584) {
                        if (virtual_holdings.indexOf(104457) !== -1) {
                          return
                        }
                      }

                      //　砺波市のためのコード
                      if (holding === 104345) {
                        if (virtual_holdings.indexOf(1104345) !== -1) {
                          return
                        }
                        if (virtual_holdings.indexOf(1104344) !== -1) {
                          return
                        }
                      }
                      if (holding === 2000000) {
                        let x = [];
                        if (virtual_holdings.indexOf(1104345) !== -1) {
                          x.push(
                            <this.props.customHoldingView url={url}
                                                          key={1104345}
                                                          uuid={uuid}
                                                          libid={1104345}
                                                          bid={bid}
                                                          label={1104345 in this.props.libraries ? this.props.libraries[1104345] : 1104345}/>
                          )
                        }
                        if (virtual_holdings.indexOf(1104344) !== -1) {
                          x.push(
                            <this.props.customHoldingView url={url}
                                                          key={1104344}
                                                          uuid={uuid}
                                                          libid={1104344}
                                                          bid={bid}
                                                          label={1104344 in this.props.libraries ? this.props.libraries[1104344] : 1104344}/>
                          )
                        }
                        return x
                      }
                      return (
                        <this.props.customHoldingView url={url}
                                                      key={holding}
                                                      uuid={uuid}
                                                      libid={holding}
                                                      bid={bid}
                                                      label={holding in this.props.libraries ? this.props.libraries[holding] : holding}/>
                      );
                    }
                  })}
                </div>
              </div>
            );
          }
        })()}
      </div>
    );
  }
}
