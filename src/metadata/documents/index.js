// модификаторы документов

import doc_work_centers_task from './doc_work_centers_task';
import doc_calc_order from './doc_calc_order';
import doc_credit_card_order from './doc_credit_card_order';
import doc_debit_cash_order from './doc_debit_cash_order';
import doc_debit_bank_order from './doc_debit_bank_order';
import doc_selling from './doc_selling';

export default function ($p) {
  doc_work_centers_task($p);
  doc_calc_order($p);
  doc_credit_card_order($p);
  doc_debit_cash_order($p);
  doc_debit_bank_order($p);
  doc_selling($p);
}
