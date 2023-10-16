/*
  Warnings:

  - You are about to drop the column `bookId` on the `CheckAdultList` table. All the data in the column will be lost.
  - You are about to drop the `Book` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `bookISBN` to the `CheckAdultList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CheckAdultList" DROP COLUMN "bookId",
ADD COLUMN     "bookISBN" TEXT NOT NULL,
ADD COLUMN     "isPass" BOOLEAN,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Book";
